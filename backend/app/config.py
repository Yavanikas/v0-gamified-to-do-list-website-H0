"""
app/config.py
-------------
Central configuration module.  All settings are read from environment
variables (populated via .env in development, real env vars in production).
"""

import os
from dotenv import load_dotenv

# Load .env file when running locally.  In production (e.g. Render / Railway)
# environment variables are injected directly — load_dotenv() is a no-op then.
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
GOOGLE_API_KEY: str = _require("GOOGLE_API_KEY")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Comma-separated list of allowed origins, e.g.
#   ALLOWED_ORIGINS=http://localhost:3000,https://my-app.vercel.app
# Defaults to wildcard "*" (fine for a hackathon / development).
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS: list[str] = (
    ["*"] if _raw_origins == "*" else [o.strip() for o in _raw_origins.split(",")]
)