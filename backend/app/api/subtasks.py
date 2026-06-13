"""
app/api/subtasks.py
-------------------
Subtask endpoints — Part 4.

POST   /api/tasks/{task_id}/breakdown        — AI generates subtasks for a task
POST   /api/tasks/{task_id}/subtasks         — manually add a subtask
PATCH  /api/subtasks/{subtask_id}/complete   — mark subtask done → earn 10 points
DELETE /api/subtasks/{subtask_id}            — delete a single subtask

Points logic (the gamification heart of the app):
  • Completing any subtask        → +10 points
  • Completing the LAST subtask   → +50 bonus points (task auto-completes too)
  • Level recalculates every time  (level = total_points // 100 + 1)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.gamification import UserGamification
from app.models.subtask import Subtask
from app.models.task import Task
from app.models.user import User
from app.services.ai import breakdown_task as ai_breakdown

router = APIRouter()

POINTS_PER_SUBTASK = 10    # earned when any subtask is completed
POINTS_TASK_BONUS  = 50    # bonus earned when ALL subtasks of a task are done


# ── Request schemas ────────────────────────────────────────────────────────────

class SubtaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    estimated_time: Optional[int] = None   # minutes

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Write unit tests for login",
                "description": "Cover happy path and error cases",
                "estimated_time": 45,
            }
        }


# ── Helper: load a task and verify ownership ───────────────────────────────────

def _get_owned_task(task_id: str, user_id, db: Session) -> Task:
    """
    Load a task by ID and confirm it belongs to the given user.
    Raises 404 if not found, 403 if wrong user.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    if str(task.user_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your task.")
    return task


def _get_owned_subtask(subtask_id: str, user_id, db: Session) -> Subtask:
    """
    Load a subtask by ID and confirm the parent task belongs to the user.
    """
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found.")

    # Check ownership via the parent task
    task = db.query(Task).filter(Task.id == subtask.task_id).first()
    if not task or str(task.user_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your subtask.")

    return subtask


# ── Endpoint 1: AI Task Breakdown ─────────────────────────────────────────────

@router.post(
    "/tasks/{task_id}/breakdown",
    status_code=status.HTTP_201_CREATED,
    summary="Use Gemini AI to auto-generate subtasks for a task",
)
def breakdown_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sends the task title and description to Gemini AI.
    Gemini returns 5–8 subtasks with estimated times.
    Those subtasks are saved to the database and returned.

    This is the 'magic' button in the frontend — user creates a task,
    clicks 'AI Breakdown', and gets a full to-do list automatically.

    Note: Requires GOOGLE_API_KEY in your .env file.
    """
    task = _get_owned_task(task_id, current_user.id, db)

    # Call Gemini AI
    try:
        subtasks_data = ai_breakdown(
            task_title=task.title,
            task_description=task.description or "",
            db=db,
        )
    except ValueError as e:
        # GOOGLE_API_KEY is missing
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except RuntimeError as e:
        # Gemini API failed after retries — no fallback
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Gemini AI is currently unavailable (rate limit or API error). "
                "Please try again later, or add subtasks manually."
            ),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {e}. Please add subtasks manually.",
        )

    # Save every AI-generated subtask to the database
    saved_subtasks = []
    for item in subtasks_data:
        subtask = Subtask(
            task_id=task.id,
            title=item["title"],
            estimated_time=item.get("estimated_time", 30),
            status="not_started",
            ai_suggested=True,   # flag so the frontend can show an AI badge
        )
        db.add(subtask)
        saved_subtasks.append(subtask)

    # Move task to in_progress since it now has subtasks
    if task.status == "not_started":
        task.status = "in_progress"

    db.commit()
    for s in saved_subtasks:
        db.refresh(s)

    return {
        "message": f"AI generated {len(saved_subtasks)} subtasks! ✨",
        "task_id": str(task.id),
        "task_status": task.status,
        "subtasks": [
            {
                "id": str(s.id),
                "title": s.title,
                "status": s.status,
                "estimated_time": s.estimated_time,
                "ai_suggested": s.ai_suggested,
            }
            for s in saved_subtasks
        ],
    }


# ── Endpoint 2: Manually Add a Subtask ────────────────────────────────────────

@router.post(
    "/tasks/{task_id}/subtasks",
    status_code=status.HTTP_201_CREATED,
    summary="Manually add a subtask to a task",
)
def add_subtask(
    task_id: str,
    data: SubtaskCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add a subtask manually (without AI).
    Useful when the user wants to add their own steps to a task.
    """
    task = _get_owned_task(task_id, current_user.id, db)

    subtask = Subtask(
        task_id=task.id,
        title=data.title,
        description=data.description,
        estimated_time=data.estimated_time,
        status="not_started",
        ai_suggested=False,
    )
    db.add(subtask)

    # Move task to in_progress if it was not started
    if task.status == "not_started":
        task.status = "in_progress"

    db.commit()
    db.refresh(subtask)

    return {
        "id": str(subtask.id),
        "title": subtask.title,
        "status": subtask.status,
        "estimated_time": subtask.estimated_time,
        "ai_suggested": subtask.ai_suggested,
        "task_id": str(task.id),
    }


# ── Endpoint 3: Complete a Subtask (the points engine) ────────────────────────

@router.patch(
    "/subtasks/{subtask_id}/complete",
    summary="Mark a subtask as done and earn points",
)
def complete_subtask(
    subtask_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark a subtask as completed.

    Points awarded:
      +10 points  — for completing this subtask
      +50 bonus   — if this was the LAST remaining subtask (task auto-completes)

    The response includes the user's updated points and level so the
    frontend can update the score display immediately without a separate call.
    """
    subtask = _get_owned_subtask(subtask_id, current_user.id, db)

    # Don't double-award points if already completed
    if subtask.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This subtask is already completed.",
        )

    # Mark this subtask done
    subtask.status = "completed"

    # Load the user's gamification record
    gamification = (
        db.query(UserGamification)
        .filter(UserGamification.user_id == current_user.id)
        .first()
    )

    if not gamification:
        # Safety net: create it if somehow missing
        gamification = UserGamification(user_id=current_user.id)
        db.add(gamification)
        db.flush()

    # Award points for this subtask
    gamification.add_points(POINTS_PER_SUBTASK)
    points_earned = POINTS_PER_SUBTASK
    task_completed = False

    # Load the parent task to check if ALL subtasks are now done
    task = db.query(Task).filter(Task.id == subtask.task_id).first()
    all_subtasks = db.query(Subtask).filter(Subtask.task_id == task.id).all()
    all_done = all(s.status == "completed" for s in all_subtasks)

    if all_done:
        # Bonus points for finishing the whole task
        gamification.add_points(POINTS_TASK_BONUS)
        points_earned += POINTS_TASK_BONUS
        task.status = "completed"
        task_completed = True

    db.commit()

    return {
        "message": (
            f"Subtask completed! +{points_earned} points 🎉"
            if not task_completed
            else f"Task fully completed! +{points_earned} points (includes {POINTS_TASK_BONUS} bonus) 🏆"
        ),
        "subtask_id": subtask_id,
        "points_earned": points_earned,
        "total_points": gamification.total_points,
        "level": gamification.level,
        "task_completed": task_completed,
    }


# ── Endpoint 4: Delete a Subtask ──────────────────────────────────────────────

@router.delete(
    "/subtasks/{subtask_id}",
    summary="Delete a subtask",
)
def delete_subtask(
    subtask_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a single subtask.
    The parent task is NOT deleted — only this one subtask.
    """
    subtask = _get_owned_subtask(subtask_id, current_user.id, db)

    db.delete(subtask)
    db.commit()

    return {"message": "Subtask deleted.", "id": subtask_id}