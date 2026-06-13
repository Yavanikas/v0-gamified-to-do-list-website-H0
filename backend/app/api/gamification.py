"""
app/api/gamification.py
-----------------------
Read-only endpoints that aggregate user gamification statistics,
user profile details, and progress bar stats.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.models.task import Task
from app.models.subtask import Subtask
from app.models.reward import Reward
from app.models.gamification import UserGamification

router = APIRouter()

def _get_or_create_gamification(user_id, db: Session) -> UserGamification:
    gamification = (
        db.query(UserGamification)
        .filter(UserGamification.user_id == user_id)
        .first()
    )
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.add(gamification)
        db.commit()
        db.refresh(gamification)
    return gamification


@router.get(
    "/user/stats",
    summary="Get complete gamification and task stats for the logged-in user",
)
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gamification = _get_or_create_gamification(current_user.id, db)
    
    total_points = gamification.total_points
    level = gamification.level
    pct = total_points % 100
    needed = 100 - pct

    # Task Stats
    total_tasks = db.query(Task).filter(Task.user_id == current_user.id).count()
    completed_tasks = db.query(Task).filter(Task.user_id == current_user.id, Task.status == "completed").count()
    in_progress_tasks = db.query(Task).filter(Task.user_id == current_user.id, Task.status == "in_progress").count()
    not_started_tasks = db.query(Task).filter(Task.user_id == current_user.id, Task.status == "not_started").count()

    # Subtask Stats
    total_subtasks = db.query(Subtask).join(Task).filter(Task.user_id == current_user.id).count()
    completed_subtasks = db.query(Subtask).join(Task).filter(Task.user_id == current_user.id, Subtask.status == "completed").count()
    ai_subtasks = db.query(Subtask).join(Task).filter(Task.user_id == current_user.id, Subtask.ai_suggested == True).count()

    # Reward Stats
    total_rewards = db.query(Reward).filter(Reward.user_id == current_user.id).count()
    claimed_rewards = db.query(Reward).filter(Reward.user_id == current_user.id, Reward.claimed == True).count()
    available_rewards = total_rewards - claimed_rewards

    return {
        "points_and_level": {
            "total_points": total_points,
            "level": level,
            "level_progress": {
                "percentage_to_next_level": pct,
                "points_needed_for_next_level": needed,
            }
        },
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "in_progress": in_progress_tasks,
            "not_started": not_started_tasks,
        },
        "subtasks": {
            "total": total_subtasks,
            "completed": completed_subtasks,
            "ai_generated": ai_subtasks,
        },
        "rewards": {
            "total": total_rewards,
            "claimed": claimed_rewards,
            "available": available_rewards,
        }
    }


@router.get(
    "/user/profile",
    summary="Get user profile and current level titles",
)
def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gamification = _get_or_create_gamification(current_user.id, db)
    level = gamification.level

    level_titles = {
        1: "Beginner",
        2: "Apprentice",
        3: "Productive",
        4: "Focused",
        5: "Efficient",
        6: "Expert",
        7: "Master",
        8: "Champion",
        9: "Legend",
    }
    level_title = level_titles.get(level, "Grandmaster")

    member_since = current_user.created_at.strftime("%B %Y") if current_user.created_at else "Unknown"

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "member_since": member_since,
        "total_points": gamification.total_points,
        "level": level,
        "level_title": level_title,
    }


@router.get(
    "/user/progress",
    summary="Get progress bar data",
)
def get_user_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gamification = _get_or_create_gamification(current_user.id, db)
    
    total_points = gamification.total_points
    level = gamification.level
    pct = total_points % 100
    needed = 100 - pct

    return {
        "total_points": total_points,
        "level": level,
        "percentage_to_next_level": pct,
        "points_needed_for_next_level": needed,
    }
