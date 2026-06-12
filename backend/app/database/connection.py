"""
app/database/connection.py
--------------------------
Creates the SQLAlchemy engine and session factory.
Exposes `get_db()` as a FastAPI dependency that yields a DB session and
guarantees it is closed after each request.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import DATABASE_URL

# ── Engine ────────────────────────────────────────────────────────────────────
# pool_pre_ping=True tells SQLAlchemy to test the connection before using it —
# essential for AWS RDS which drops idle connections after a few minutes.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    # AWS RDS requires SSL in many configurations; psycopg2 reads the SSL mode
    # from the connection string itself (sslmode=require) if you include it.
    # The connect_timeout prevents hanging on bad credentials / unreachable host.
    connect_args={"connect_timeout": 10},
)

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ── FastAPI dependency ────────────────────────────────────────────────────────
def get_db():
    """
    Yield a SQLAlchemy session for the duration of a single request.
    Always closed in the finally block — even on exceptions.

    Usage in a route:
        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()