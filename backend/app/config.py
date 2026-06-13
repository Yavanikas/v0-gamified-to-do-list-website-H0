"""
app/config.py
-------------
Central configuration module.  All settings are read from environment
variables (populated via .env in development, real env vars in production).
"""

import os
from dotenv import load_dotenv

load_dotenv()


def _require(key: str) -> str:
    """Raise a clear error if a required env-var is missing."""
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Check your .env file or deployment config."
        )
    return value


# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL: str = _require("DATABASE_URL")

# ── Auth ──────────────────────────────────────────────────────────────────────
SECRET_KEY: str = _require("SECRET_KEY")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS: int = 7

# ── AI ────────────────────────────────────────────────────────────────────────
# Optional at startup — server runs fine without it.
# AI endpoints return a clear error if key is missing.
# Add GROQ_API_KEY to your .env before testing Part 4 / Part 5.
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS: list[str] = (
    ["*"] if _raw_origins == "*" else [o.strip() for o in _raw_origins.split(",")]
)