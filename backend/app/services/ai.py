"""
app/services/ai.py
------------------
All communication with Groq AI lives here.

Two functions are exposed:
  breakdown_task()   — given a task title + description, returns a list of subtasks
  analyze_reward()   — given a reward name + description, suggests a fair points cost

Rate-limit protection (2 layers):
  1. DATABASE CACHE  — identical requests are served from the ai_cache table
                       without touching the Groq API at all.
  2. EXPONENTIAL BACKOFF — if the API returns a rate-limit error (429),
                       we wait and retry up to 3 times before giving up.

NO local fallback — if Groq fails, we raise a clear error so the user
knows to add subtasks manually or try again later.
"""

import hashlib
import json
import logging
import re
import time

from groq import Groq
from sqlalchemy.orm import Session

from app.config import GROQ_API_KEY
from app.models.ai_cache import AICache

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_RETRIES = 3          # retry up to 3 times on rate-limit errors
INITIAL_BACKOFF = 2      # first retry waits 2 seconds, then 4, then 8


# ── Groq client ─────────────────────────────────────────────────────────────

def _get_client():
    """
    Create and return a Groq API client.
    Raises ValueError if the API key is missing.
    """
    if not GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY is not set in your .env file. "
            "Get a free key at https://console.groq.com/keys "
            "and add it to your .env file."
        )
    return Groq(api_key=GROQ_API_KEY)


# ── Text utilities ────────────────────────────────────────────────────────────

def _normalize_text(text: str) -> str:
    """
    Normalize input text to maximize cache hits.
    """
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)      # collapse multiple spaces
    return text


def _make_cache_key(function_name: str, *args: str) -> str:
    """
    Build a deterministic SHA-256 cache key from the function name and
    its normalized input arguments.
    """
    parts = [function_name] + [_normalize_text(a) for a in args]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _extract_json(text: str) -> str:
    """
    Strip markdown code fences from AI response if present.
    """
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _get_cache(db: Session, key: str):
    """Look up a cached AI response by its hash key. Returns parsed JSON or None."""
    entry = db.query(AICache).filter(AICache.cache_key == key).first()
    if entry:
        logger.info("Cache HIT for key %s — skipping Groq API call", key[:16])
        try:
            return json.loads(entry.response_json)
        except json.JSONDecodeError:
            return None
    return None


def _set_cache(db: Session, key: str, data) -> None:
    """Store an AI response in the database cache."""
    try:
        entry = AICache(
            cache_key=key,
            response_json=json.dumps(data, ensure_ascii=False),
        )
        db.add(entry)
        db.commit()
        logger.info("Cache STORED for key %s", key[:16])
    except Exception:
        # If there is a unique-constraint race condition, silently ignore
        db.rollback()


# ── Groq API call with exponential backoff ──────────────────────────────────

def _call_groq_with_retry(prompt: str) -> str:
    """
    Call the Groq API with exponential backoff on rate-limit errors.
    Retries up to MAX_RETRIES times. On each retry, waits
    INITIAL_BACKOFF * 2^attempt seconds (2s, 4s, 8s).
    """
    client = _get_client()
    last_exception = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            last_exception = e
            error_str = str(e).lower()

            logger.error(
                "Groq API error (attempt %d/%d): %s",
                attempt + 1, MAX_RETRIES + 1, e,
            )

            # Check if this is a rate-limit / quota error
            is_rate_limit = any(keyword in error_str for keyword in [
                "429", "rate limit", "too many requests"
            ])

            if is_rate_limit and attempt < MAX_RETRIES:
                wait_time = INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(
                    "Groq rate limit hit (attempt %d/%d). "
                    "Waiting %ds before retry...",
                    attempt + 1, MAX_RETRIES, wait_time,
                )
                time.sleep(wait_time)
            else:
                # Not a rate-limit error, or we've exhausted retries
                break

    # Raise a clear error — NO silent fallback
    raise RuntimeError(
        f"Groq AI is currently unavailable after {MAX_RETRIES + 1} attempts. "
        f"Last error: {last_exception}. "
        f"Please try again later, or add subtasks/rewards manually."
    )


# ── Function 1: Break down a task into subtasks ────────────────────────────────

def breakdown_task(task_title: str, task_description: str, db: Session = None) -> list[dict]:
    # ── Step 1: Check cache ──
    cache_key = _make_cache_key("breakdown", task_title, task_description or "")
    if db:
        cached = _get_cache(db, cache_key)
        if cached and isinstance(cached, list) and len(cached) > 0:
            return cached

    # ── Step 2: Call Groq with retry ──
    prompt = f"""
You are a productivity assistant. Break down the following task into 5 to 8 small,
actionable subtasks that a developer can complete one by one.

Task Title: {task_title}
Task Description: {task_description if task_description else "No description provided"}

Rules:
- Each subtask should take 10 to 60 minutes
- Subtasks should be in a logical order
- Be specific and actionable (start with a verb like "Create", "Write", "Test", "Add")
- Return ONLY a valid JSON array, no explanation, no markdown, no extra text

Return format (copy this exactly):
[
    {{"title": "Subtask title here", "estimated_time": 30}},
    {{"title": "Another subtask", "estimated_time": 20}}
]
"""

    raw_response = _call_groq_with_retry(prompt)
    clean_json = _extract_json(raw_response)
    try:
        subtasks = json.loads(clean_json)
    except Exception:
        raise RuntimeError("Groq returned invalid JSON data. Please try again.")

    # Validate the structure
    if not isinstance(subtasks, list):
        raise RuntimeError("Groq returned invalid data (not a list). Please try again.")

    validated = []
    for item in subtasks:
        if isinstance(item, dict) and "title" in item:
            validated.append({
                "title": str(item["title"]),
                "estimated_time": int(item.get("estimated_time", 30)),
            })

    if not validated:
        raise RuntimeError("Groq returned no valid subtasks. Please try again.")

    # ── Step 3: Store in cache ──
    if db:
        _set_cache(db, cache_key, validated)

    return validated


# ── Function 2: Suggest a fair points cost for a reward ───────────────────────

def analyze_reward(reward_name: str, reward_description: str, db: Session = None) -> dict:
    # ── Step 1: Check cache ──
    cache_key = _make_cache_key("reward", reward_name, reward_description or "")
    if db:
        cached = _get_cache(db, cache_key)
        if cached and isinstance(cached, dict):
            return cached

    # ── Step 2: Call Groq with retry ──
    prompt = f"""
You are a gamification expert helping someone stay productive.
They earn points by completing tasks, and spend points on real-life rewards.

Suggest a fair points cost for this reward (between 50 and 500 points).

Reward Name: {reward_name}
Reward Description: {reward_description if reward_description else "No description provided"}

Pricing guide:
- 50-100 points  = small reward (5-min break, a glass of water, a short walk)
- 100-200 points = medium reward (15-30 min of leisure, a snack, an episode of a show)
- 200-350 points = large reward (an hour of gaming, ordering food, a movie)
- 350-500 points = big reward (a full day off, a purchase, a special outing)

Rules:
- Return ONLY valid JSON, no explanation outside the JSON, no markdown
- Be encouraging — rewards should feel achievable but earned

Return format (copy this exactly):
{{"suggested_cost": 150, "reasoning": "Your one sentence explanation here"}}
"""

    raw_response = _call_groq_with_retry(prompt)
    clean_json = _extract_json(raw_response)
    try:
        result = json.loads(clean_json)
    except Exception:
        raise RuntimeError("Groq returned invalid JSON data. Please try again.")

    if not isinstance(result, dict):
        raise RuntimeError("Groq returned invalid data (not a dict). Please try again.")

    suggested_cost = int(result.get("suggested_cost", 100))
    suggested_cost = max(50, min(500, suggested_cost))

    validated = {
        "suggested_cost": suggested_cost,
        "reasoning": str(result.get("reasoning", "AI suggested this cost.")),
    }

    # ── Step 3: Store in cache ──
    if db:
        _set_cache(db, cache_key, validated)

    return validated