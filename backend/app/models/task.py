"""
app/models/task.py
------------------
A top-level task created by a user.

Status lifecycle
----------------
  not_started  →  in_progress  →  completed

The status is auto-promoted to "completed" when all subtasks are marked done
(handled in the API layer, not here in the model).

Fields
------
id          — UUID PK
user_id     — FK → users.id
title       — short label shown in the task list (frontend renders this)
description — optional longer detail used by the AI to generate subtasks
status      — not_started | in_progress | completed
priority    — low | medium | high (shown as colour badge on the frontend)
due_date    — optional ISO date string stored as plain VARCHAR for simplicity
"""

import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.base import Base, TimestampMixin


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # not_started | in_progress | completed
    status = Column(String(20), nullable=False, default="not_started")

    # low | medium | high  — optional; default medium
    priority = Column(String(10), nullable=False, default="medium")

    # Optional due date (stored as string — keep it simple for the hackathon)
    due_date = Column(String(20), nullable=True)

    # AI dynamically assigned bonus
    bonus_points = Column(Integer, nullable=False, default=50)
    bonus_reason = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="tasks")
    subtasks = relationship(
        "Subtask",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="Subtask.created_at",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Task id={self.id} title={self.title!r} status={self.status!r}>"