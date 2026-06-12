"""
app/models/reward.py
--------------------
A real-life reward that the user wants to earn.

Examples: "15 minutes of Instagram", "30-min walk", "favourite snack".

The user sets a cost (in points).  They can also ask the AI to suggest a
fair cost — the AI's answer is saved in ai_suggested_cost / ai_reason for
display in the frontend.  The user then decides whether to apply the AI cost.

Fields
------
id               — UUID PK
user_id          — FK → users.id (cascade delete)
name             — short label, e.g. "Watch YouTube for 20 min"
description      — optional longer detail
cost             — points cost set by the user (editable)
ai_suggested_cost— cost suggested by Gemini (may differ from cost)
ai_reason        — Gemini's explanation of its suggested cost
claimed          — True once the user redeems this reward
"""

import uuid
from sqlalchemy import Boolean, Column, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.base import Base, TimestampMixin


class Reward(Base, TimestampMixin):
    __tablename__ = "rewards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # User-defined points cost
    cost = Column(Integer, nullable=False, default=100)

    # AI-suggested points cost (populated after calling /rewards/{id}/analyze)
    ai_suggested_cost = Column(Integer, nullable=True)
    ai_reason = Column(Text, nullable=True)

    # Has this reward already been redeemed?
    claimed = Column(Boolean, nullable=False, default=False)

    # Relationship
    user = relationship("User", back_populates="rewards")

    def __repr__(self) -> str:
        return (
            f"<Reward id={self.id} name={self.name!r} "
            f"cost={self.cost} claimed={self.claimed}>"
        )