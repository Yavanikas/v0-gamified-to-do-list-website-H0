"""
app/database/base.py
--------------------
SQLAlchemy declarative Base and a reusable TimestampMixin.
All model files import Base from here — never create a second Base.
"""

from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import declarative_base

# Single shared Base — every model inherits from this.
Base = declarative_base()


class TimestampMixin:
    """
    Adds created_at / updated_at columns to any model.

    created_at  — set once at INSERT time by the DB server.
    updated_at  — set at INSERT and refreshed on every UPDATE.
    """

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )