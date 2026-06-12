"""
app/models/gamification.py
--------------------------
One-to-one companion record for each User that tracks gamification state.

Points logic (enforced in the API layer)
-----------------------------------------
+10 pts   — completing a subtask
+50 pts   — bonus when ALL subtasks of a task are completed
-N  pts   — claiming a reward costs N points

Level formula
-------------
    level = (total_points // 100) + 1
So level 1 = 0–99 pts, level 2 = 100–199 pts, etc.
(The frontend may display a progress bar based on this.)

Fields
------
id            — UUID PK
user_id       — FK → users.id (unique — enforces one-to-one)
total_points  — running total; never goes below 0
level         — derived from total_points; recomputed on every change
"""

import uuid
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.base import Base


class UserGamification(Base):
    __tablename__ = "user_gamification"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    total_points = Column(Integer, nullable=False, default=0)
    level = Column(Integer, nullable=False, default=1)

    # Relationship back to User
    user = relationship("User", back_populates="gamification")

    # ── Helper ───────────────────────────────────────────────────────────────
    def recalculate_level(self) -> None:
        """Recompute and set level from total_points. Call after any point change."""
        self.level = (self.total_points // 100) + 1

    def add_points(self, amount: int) -> None:
        """Add points and refresh level."""
        self.total_points += amount
        self.recalculate_level()

    def deduct_points(self, amount: int) -> None:
        """Deduct points (floor at 0) and refresh level."""
        self.total_points = max(0, self.total_points - amount)
        self.recalculate_level()

    def __repr__(self) -> str:
        return (
            f"<UserGamification user_id={self.user_id} "
            f"points={self.total_points} level={self.level}>"
        )