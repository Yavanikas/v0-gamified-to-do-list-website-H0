"""
app/services/ai.py
------------------
All communication with Groq AI lives here.

Three functions are exposed:
  breakdown_task()         — given a task title + description, returns a list of subtasks
  analyze_reward()         — given a reward name + description, suggests a fair points cost
  analyze_task_difficulty()— evaluates a task and assigns dynamic bonus points

Rate-limit protection (2 layers):
  1. DATABASE CACHE  — identical requests are served from the ai_cache table
  2. EXPONENTIAL BACKOFF — retries up to 3 times on rate-limit errors (429)

Safe Fallbacks:
  If the API fails completely, functions return safe default values so the 
  application never crashes.
"""

import hashlib
import json
import logging
import re
import time
from typing import Optional

# Monkeypatch httpx to maintain compatibility between newer httpx (0.28+) 
# and older groq (0.9.0) which uses the deprecated 'proxies' argument.
import httpx

orig_client_init = httpx.Client.__init__
def patched_client_init(self, *args, **kwargs):
    if "proxies" in kwargs:
        proxies = kwargs.pop("proxies")
        if "proxy" not in kwargs:
            if isinstance(proxies, dict):
                kwargs["proxy"] = proxies.get("http://") or proxies.get("https://") or next(iter(proxies.values()), None)
            else:
                kwargs["proxy"] = proxies
    orig_client_init(self, *args, **kwargs)
httpx.Client.__init__ = patched_client_init

orig_async_client_init = httpx.AsyncClient.__init__
def patched_async_client_init(self, *args, **kwargs):
    if "proxies" in kwargs:
        proxies = kwargs.pop("proxies")
        if "proxy" not in kwargs:
            if isinstance(proxies, dict):
                kwargs["proxy"] = proxies.get("http://") or proxies.get("https://") or next(iter(proxies.values()), None)
            else:
                kwargs["proxy"] = proxies
    orig_async_client_init(self, *args, **kwargs)
httpx.AsyncClient.__init__ = patched_async_client_init

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
    if not GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY is not set in your .env file. "
            "Get your free Groq key at https://console.groq.com "
            "and add it to your .env file."
        )
    return Groq(api_key=GROQ_API_KEY)


# ── Text utilities ────────────────────────────────────────────────────────────

def _normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text

def _make_cache_key(function_name: str, *args: str) -> str:
    parts = [function_name] + [_normalize_text(a) for a in args]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def _extract_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()

# ── Cache helpers ─────────────────────────────────────────────────────────────

def _get_cache(db: Session, key: str):
    if not db:
        return None
    try:
        entry = db.query(AICache).filter(AICache.cache_key == key).first()
        if entry:
            logger.info("Cache HIT for key %s", key[:16])
            return json.loads(entry.response_json)
    except Exception:
        pass
    return None

def _set_cache(db: Session, key: str, data) -> None:
    if not db:
        return
    try:
        entry = AICache(
            cache_key=key,
            response_json=json.dumps(data, ensure_ascii=False),
        )
        db.add(entry)
        db.commit()
        logger.info("Cache STORED for key %s", key[:16])
    except Exception:
        db.rollback()

# ── Shared Chat Helper ────────────────────────────────────────────────────────

def _chat(prompt: str) -> str:
    """
    Call the Groq API with exponential backoff on rate-limit errors.
    """
    client = _get_client()
    last_exception = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a helpful API that returns ONLY valid JSON arrays or objects. No markdown, no explanations."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
            )
            return response.choices[0].message.content
        except Exception as e:
            last_exception = e
            error_str = str(e).lower()
            logger.error("Groq API error (attempt %d/%d): %s", attempt + 1, MAX_RETRIES + 1, e)

            is_rate_limit = any(keyword in error_str for keyword in ["429", "rate limit", "too many requests"])

            if is_rate_limit and attempt < MAX_RETRIES:
                wait_time = INITIAL_BACKOFF * (2 ** attempt)
                time.sleep(wait_time)
            else:
                raise last_exception

    raise last_exception


# ── Public API Functions ──────────────────────────────────────────────────────

def breakdown_task(task_title: str, task_description: str, db: Session = None) -> list[dict]:
    try:
        cache_key = _make_cache_key("breakdown", task_title, task_description or "")
        cached = _get_cache(db, cache_key)
        if cached and isinstance(cached, list):
            return cached

        prompt = f"""
        Break down the following task into 5 to 8 small, actionable subtasks.
        For each subtask, estimate the time in minutes and suggest a fair point reward (between 5 and 30) based on complexity.
        Task Title: {task_title}
        Task Description: {task_description or 'None'}

        Return ONLY a JSON array with this format:
        [
            {{"title": "Subtask title", "estimated_time": 30, "points": 15}}
        ]
        """
        raw_response = _chat(prompt)
        clean_json = _extract_json(raw_response)
        subtasks = json.loads(clean_json)

        if not isinstance(subtasks, list):
            raise RuntimeError("AI response is not a valid list.")

        validated = []
        for item in subtasks:
            if isinstance(item, dict) and "title" in item and item["title"].strip():
                pts = int(item.get("points", 10))
                pts = max(5, min(30, pts))
                validated.append({
                    "title": str(item["title"]).strip(),
                    "estimated_time": int(item.get("estimated_time", 30)),
                    "points": pts,
                })
        
        if not validated:
            raise RuntimeError("AI generated zero valid subtasks.")

        _set_cache(db, cache_key, validated)
        return validated
    except Exception as e:
        logger.error("breakdown_task failed: %s", e)
        if isinstance(e, ValueError):
            raise e
        raise RuntimeError(f"AI service failed to generate subtasks: {e}")


def analyze_reward(reward_name: str, reward_description: str, db: Session = None) -> dict:
    default_resp = {"suggested_cost": 100, "reasoning": "Default"}
    try:
        cache_key = _make_cache_key("reward", reward_name, reward_description or "")
        cached = _get_cache(db, cache_key)
        if cached and isinstance(cached, dict):
            return cached

        prompt = f"""
        Suggest a fair points cost for this reward (between 50 and 500).
        Reward Name: {reward_name}
        Reward Description: {reward_description or 'None'}

        Return ONLY a JSON object with this format:
        {{"suggested_cost": 150, "reasoning": "Your explanation"}}
        """
        raw_response = _chat(prompt)
        clean_json = _extract_json(raw_response)
        result = json.loads(clean_json)

        if not isinstance(result, dict):
            return default_resp

        suggested_cost = int(result.get("suggested_cost", 100))
        suggested_cost = max(50, min(500, suggested_cost))

        validated = {
            "suggested_cost": suggested_cost,
            "reasoning": str(result.get("reasoning", "AI suggested this cost.")),
        }

        _set_cache(db, cache_key, validated)
        return validated
    except Exception as e:
        logger.error("analyze_reward failed: %s", e)
        return default_resp


def analyze_task_difficulty(task_title: str, task_description: str, priority: str, due_date: str, db: Session = None) -> dict:
    default_resp = {"bonus_points": 50, "reason": "Default"}
    try:
        cache_key = _make_cache_key("difficulty", task_title, task_description or "", priority or "", due_date or "")
        cached = _get_cache(db, cache_key)
        if cached and isinstance(cached, dict):
            return cached

        prompt = f"""
        Analyze this task's difficulty and urgency to suggest bonus points (25-200).
        Task Title: {task_title}
        Task Description: {task_description or 'None'}
        Priority: {priority or 'None'}
        Due Date: {due_date or 'None'}

        Scoring logic:
        - 25-50: easy
        - 50-100: moderate
        - 100-150: hard or urgent
        - 150-200: very hard AND urgent

        Return ONLY a JSON object with this format:
        {{"bonus_points": 75, "reason": "Your explanation"}}
        """
        raw_response = _chat(prompt)
        clean_json = _extract_json(raw_response)
        result = json.loads(clean_json)

        if not isinstance(result, dict):
            return default_resp

        bonus_points = int(result.get("bonus_points", 50))
        bonus_points = max(25, min(200, bonus_points))

        validated = {
            "bonus_points": bonus_points,
            "reason": str(result.get("reason", "AI assigned this bonus.")),
        }

        _set_cache(db, cache_key, validated)
        return validated
    except Exception as e:
        logger.error("analyze_task_difficulty failed: %s", e)
        return default_resp