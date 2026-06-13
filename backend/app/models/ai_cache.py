"""
app/models/ai_cache.py
----------------------
Database-level cache for Gemini AI responses.

Every time we call the Gemini API, we store the result here keyed by a
SHA-256 hash of the normalized prompt inputs. Before making any API call,
we check this table first. If we find a match, we return the cached
response instantly — zero tokens consumed, zero API requests made.

This is the primary mechanism for staying within the Gemini free tier
(15 RPM, 1M TPM) during development and production.
"""

import uuid
from sqlalchemy import Column, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.database.base import Base


class AICache(Base):
    __tablename__ = "ai_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)

    # SHA-256 hash of normalized (function_name + title + description)
    cache_key = Column(String(512), unique=True, index=True, nullable=False)

    # The full JSON response stored as text
    response_json = Column(Text, nullable=False)

    # When this cache entry was created
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AICache key={self.cache_key[:16]}... created={self.created_at}>"
