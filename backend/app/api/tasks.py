"""
app/api/tasks.py
----------------
Task management endpoints.

GET    /api/tasks              — list all tasks for the logged-in user
POST   /api/tasks              — create a new task
GET    /api/tasks/{task_id}    — get one task with its subtasks
PUT    /api/tasks/{task_id}    — edit a task's title/description/priority/due_date
DELETE /api/tasks/{task_id}    — delete a task (and all its subtasks)
PATCH  /api/tasks/{task_id}/status — change the status (not_started/in_progress/completed)

Every endpoint requires the user to be logged in (the JWT token is checked
automatically by Depends(get_current_user)).

Each user can only see and edit THEIR OWN tasks.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.task import Task
from app.models.subtask import Subtask
from app.models.user import User
from app.services.ai import analyze_task_difficulty

router = APIRouter()

# ── Allowed values ─────────────────────────────────────────────────────────────
VALID_STATUSES = {"not_started", "in_progress", "completed"}
VALID_PRIORITIES = {"low", "medium", "high"}


# ── Request schemas (what the frontend sends) ──────────────────────────────────

class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None  # e.g. "2024-12-31"

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Build login page",
                "description": "Create the login form with email and password fields",
                "priority": "high",
                "due_date": "2024-12-31",
            }
        }


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Updated task title",
                "priority": "low",
            }
        }


class TaskStatusRequest(BaseModel):
    status: str

    class Config:
        json_schema_extra = {
            "example": {"status": "in_progress"}
        }


# ── Response schemas (what the API sends back) ─────────────────────────────────

class SubtaskInTask(BaseModel):
    """A subtask embedded inside a task response."""
    id: str
    title: str
    status: str
    estimated_time: Optional[int] = None
    points: int
    ai_suggested: bool

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[str]
    subtasks: list[SubtaskInTask]
    subtask_count: int
    completed_subtask_count: int

    class Config:
        from_attributes = True


# ── Helper function ────────────────────────────────────────────────────────────

def format_task(task: Task) -> dict:
    """
    Convert a Task database object into the dictionary the frontend expects.
    Called by every endpoint that returns task data.
    """
    subtasks = task.subtasks or []
    completed = sum(1 for s in subtasks if s.status == "completed")

    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description or "",
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date,
        "subtasks": [
            {
                "id": str(s.id),
                "title": s.title,
                "status": s.status,
                "estimated_time": s.estimated_time,
                "points": s.points,
                "ai_suggested": s.ai_suggested,
            }
            for s in subtasks
        ],
        "subtask_count": len(subtasks),
        "completed_subtask_count": completed,
        "bonus_points": task.bonus_points,
        "bonus_reason": task.bonus_reason or "",
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get(
    "/tasks",
    summary="Get all tasks for the logged-in user",
)
def list_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns every task belonging to the logged-in user,
    each with its list of subtasks.

    The frontend uses this to populate the main task list on the dashboard.
    """
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.created_at.desc())   # newest tasks first
        .all()
    )
    return [format_task(t) for t in tasks]


@router.post(
    "/tasks",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
)
def create_task(
    data: TaskCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new task for the logged-in user.

    After creating a task, the frontend can call POST /tasks/{id}/breakdown
    to have Gemini AI split it into subtasks automatically.
    """
    # Validate priority value
    if data.priority and data.priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Priority must be one of: {', '.join(VALID_PRIORITIES)}",
        )

    task = Task(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        priority=data.priority or "medium",
        due_date=data.due_date,
        status="not_started",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    try:
        difficulty_data = analyze_task_difficulty(
            task_title=task.title,
            task_description=task.description,
            priority=task.priority,
            due_date=task.due_date,
            db=db,
        )
        task.bonus_points = difficulty_data["bonus_points"]
        task.bonus_reason = difficulty_data["reason"]
        db.commit()
        db.refresh(task)
    except Exception:
        pass

    return format_task(task)


@router.get(
    "/tasks/{task_id}",
    summary="Get a single task by ID",
)
def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get full details of one task including all its subtasks.
    Returns 404 if the task doesn't exist or belongs to a different user.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    # Security check: make sure this task belongs to the logged-in user
    if str(task.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this task.",
        )

    return format_task(task)


@router.put(
    "/tasks/{task_id}",
    summary="Update a task's title, description, priority, or due date",
)
def update_task(
    task_id: str,
    data: TaskUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Edit a task. Only the fields you send will be updated
    (sending {"title": "New title"} only changes the title).

    You cannot change the status here — use PATCH /tasks/{id}/status for that.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    if str(task.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your task.")

    # Only update fields that were actually sent (not None)
    needs_reanalysis = False
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.priority is not None:
        if data.priority not in VALID_PRIORITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Priority must be one of: {', '.join(VALID_PRIORITIES)}",
            )
        if task.priority != data.priority:
            task.priority = data.priority
            needs_reanalysis = True
    if data.due_date is not None:
        if task.due_date != data.due_date:
            task.due_date = data.due_date
            needs_reanalysis = True

    db.commit()
    db.refresh(task)

    if needs_reanalysis:
        try:
            difficulty_data = analyze_task_difficulty(
                task_title=task.title,
                task_description=task.description,
                priority=task.priority,
                due_date=task.due_date,
                db=db,
            )
            task.bonus_points = difficulty_data["bonus_points"]
            task.bonus_reason = difficulty_data["reason"]
            db.commit()
            db.refresh(task)
        except Exception:
            pass

    return format_task(task)


@router.patch(
    "/tasks/{task_id}/status",
    summary="Change a task's status",
)
def update_task_status(
    task_id: str,
    data: TaskStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change the status of a task.
    Valid values: not_started, in_progress, completed

    Note: status is also auto-updated to 'completed' when all subtasks
    are checked off (that logic lives in the subtask completion endpoint).
    """
    if data.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status must be one of: {', '.join(VALID_STATUSES)}",
        )

    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    if str(task.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your task.")

    task.status = data.status
    db.commit()
    db.refresh(task)

    return {
        "id": str(task.id),
        "status": task.status,
        "message": f"Task status updated to '{task.status}'",
    }


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a task and all its subtasks",
)
def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete a task. All subtasks belonging to this task
    are also deleted automatically (cascade delete).
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    if str(task.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your task.")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully.", "id": task_id}
