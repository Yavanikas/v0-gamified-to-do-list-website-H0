"""
app/main.py
-----------
FastAPI application entry point.

Routers are registered here as they are built across the 6 parts:
  Part 2 — auth router
  Part 3 — tasks router
  Part 4 — subtasks router
  Part 5 — rewards router
  Part 6 — gamification / user-stats router

For now (Part 1) only the health-check endpoint is live so you can verify
the server starts and your DATABASE_URL is reachable before writing any
business logic.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS
from app.database.connection import engine
from app.database.base import Base

# ── Create tables (fallback for development without Alembic) ──────────────────
# In production you should use: alembic upgrade head
# This line is a safety net so `uvicorn app.main:app` always has a schema.
# Import all models first so Base.metadata knows about every table.
import app.models  # noqa: F401
Base.metadata.create_all(bind=engine)

# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Gamified To-Do API",
    description=(
        "Backend for the Gamified To-Do list app. "
        "Uses Gemini AI for task breakdown and reward pricing."
    ),
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at http://localhost:8000/docs
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# The frontend (Next.js on localhost:3000 or Vercel) needs CORS allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers (uncomment as each part is added) ─────────────────────────────────
from app.api.auth import router as auth_router          # Part 2
from app.api.tasks import router as tasks_router        # Part 3
# from app.api.subtasks import router as subtasks_router  # Part 4
# from app.api.rewards import router as rewards_router    # Part 5
# from app.api.gamification import router as stats_router # Part 6

app.include_router(auth_router,    prefix="/api", tags=["Auth"])
app.include_router(tasks_router,   prefix="/api", tags=["Tasks"])
# app.include_router(subtasks_router,prefix="/api", tags=["Subtasks"])
# app.include_router(rewards_router, prefix="/api", tags=["Rewards"])
# app.include_router(stats_router,   prefix="/api", tags=["Gamification"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """
    Quick liveness probe — confirm the server is running.
    Returns a 200 if the app starts correctly.
    """
    return {"status": "ok", "message": "Gamified To-Do API is running"}