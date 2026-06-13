"""
app/api/rewards.py
------------------
Rewards endpoints — Part 5.

GET    /api/rewards                    — list all rewards for the logged-in user
POST   /api/rewards                    — create a new reward
PUT    /api/rewards/{reward_id}        — edit a reward's name/description/cost
DELETE /api/rewards/{reward_id}        — delete a reward
POST   /api/rewards/{reward_id}/analyze — ask AI to suggest a fair points cost
POST   /api/rewards/{reward_id}/claim  — spend points to claim a reward

Real-life rewards examples:
  "15 minutes of Instagram"
  "Watch one YouTube video"
  "Order your favourite food"
  "30-minute gaming session"
  "An episode of a show"

The user creates rewards, sets a cost in points, optionally asks AI to
suggest a better cost, then claims the reward once they have enough points.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.gamification import UserGamification
from app.models.reward import Reward
from app.models.user import User
from app.services.ai import analyze_reward as ai_analyze_reward

router = APIRouter()


# ── Request schemas ────────────────────────────────────────────────────────────

class RewardCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    cost: int = 100   # default 100 points

    class Config:
        json_schema_extra = {
            "example": {
                "name": "15 minutes of Instagram",
                "description": "Guilt-free social media scroll",
                "cost": 100,
            }
        }


class RewardUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "30 minutes of Instagram",
                "cost": 150,
            }
        }


# ── Helper: format a reward for the API response ──────────────────────────────

def format_reward(reward: Reward) -> dict:
    """Convert a Reward database object into a dictionary for the frontend."""
    return {
        "id": str(reward.id),
        "name": reward.name,
        "description": reward.description or "",
        "cost": reward.cost,
        "ai_suggested_cost": reward.ai_suggested_cost,
        "ai_reason": reward.ai_reason or "",
        "claimed": reward.claimed,
    }


# ── Endpoint 1: List all rewards ──────────────────────────────────────────────

@router.get(
    "/rewards",
    summary="Get all rewards for the logged-in user",
)
def list_rewards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns all rewards the user has created.
    Unclaimed rewards are shown first, then claimed ones.

    The frontend uses this to show the rewards shop/list.
    """
    rewards = (
        db.query(Reward)
        .filter(Reward.user_id == current_user.id)
        .order_by(Reward.claimed.asc(), Reward.created_at.desc())
        .all()
    )
    return [format_reward(r) for r in rewards]


# ── Endpoint 2: Create a reward ───────────────────────────────────────────────

@router.post(
    "/rewards",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new reward",
)
def create_reward(
    data: RewardCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new real-life reward.
    The user sets the points cost themselves.
    They can then call POST /rewards/{id}/analyze to get an AI suggestion.
    """
    if data.cost < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cost must be at least 1 point.",
        )

    reward = Reward(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        cost=data.cost,
    )
    db.add(reward)
    db.commit()
    db.refresh(reward)

    return format_reward(reward)


# ── Endpoint 3: Update a reward ───────────────────────────────────────────────

@router.put(
    "/rewards/{reward_id}",
    summary="Edit a reward's name, description, or cost",
)
def update_reward(
    reward_id: str,
    data: RewardUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Edit a reward. Only send the fields you want to change.
    You cannot edit a reward that has already been claimed.
    """
    reward = db.query(Reward).filter(Reward.id == reward_id).first()

    if not reward:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward not found.")

    if str(reward.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your reward.")

    if reward.claimed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a reward that has already been claimed.",
        )

    if data.name is not None:
        reward.name = data.name
    if data.description is not None:
        reward.description = data.description
    if data.cost is not None:
        if data.cost < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cost must be at least 1 point.",
            )
        reward.cost = data.cost

    db.commit()
    db.refresh(reward)

    return format_reward(reward)


# ── Endpoint 4: Delete a reward ───────────────────────────────────────────────

@router.delete(
    "/rewards/{reward_id}",
    summary="Delete a reward",
)
def delete_reward(
    reward_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete a reward."""
    reward = db.query(Reward).filter(Reward.id == reward_id).first()

    if not reward:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward not found.")

    if str(reward.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your reward.")

    db.delete(reward)
    db.commit()

    return {"message": "Reward deleted.", "id": reward_id}


# ── Endpoint 5: AI Reward Pricing ─────────────────────────────────────────────

@router.post(
    "/rewards/{reward_id}/analyze",
    summary="Ask AI to suggest a fair points cost for this reward",
)
def analyze_reward(
    reward_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sends the reward name and description to Gemini AI.
    Gemini suggests a fair points cost based on how indulgent the reward is.

    The suggestion is SAVED to the reward record (ai_suggested_cost, ai_reason)
    but does NOT automatically change the user's set cost.
    The frontend shows both values so the user can decide.

    Example:
      Reward: "1 hour of gaming"
      AI suggests: 200 points
      Reasoning: "An hour of gaming is a significant leisure break..."

    Note: Requires GOOGLE_API_KEY in your .env file.
    """
    reward = db.query(Reward).filter(Reward.id == reward_id).first()

    if not reward:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward not found.")

    if str(reward.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your reward.")

    # Call Gemini AI
    try:
        analysis = ai_analyze_reward(
            reward_name=reward.name,
            reward_description=reward.description or "",
            db=db,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except RuntimeError as e:
        # Gemini API failed after retries
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Gemini AI is currently unavailable (rate limit or API error). "
                "Please try again later."
            ),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {e}. Please try again later.",
        )

    # Save AI suggestion to the reward record
    reward.ai_suggested_cost = analysis["suggested_cost"]
    reward.ai_reason = analysis["reasoning"]
    db.commit()
    db.refresh(reward)

    return {
        "reward_id": str(reward.id),
        "reward_name": reward.name,
        "your_cost": reward.cost,
        "ai_suggested_cost": reward.ai_suggested_cost,
        "ai_reasoning": reward.ai_reason,
        "message": (
            "AI analysis complete! You can keep your cost or update it "
            "to the AI suggestion using PUT /rewards/{id}."
        ),
    }


# ── Endpoint 6: Claim a Reward ────────────────────────────────────────────────

@router.post(
    "/rewards/{reward_id}/claim",
    summary="Spend points to claim a reward",
)
def claim_reward(
    reward_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Claim a reward by spending points.

    Checks:
      - Reward exists and belongs to this user
      - Reward hasn't already been claimed
      - User has enough points

    If all checks pass:
      - Points are deducted from the user's total
      - Reward is marked as claimed
      - Updated points + level are returned (frontend can refresh display)

    Example:
      User has 250 points.
      Reward costs 150 points.
      After claim: user has 100 points, reward.claimed = True.
    """
    reward = db.query(Reward).filter(Reward.id == reward_id).first()

    if not reward:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward not found.")

    if str(reward.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your reward.")

    if reward.claimed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You've already claimed this reward.",
        )

    # Load the user's gamification record
    gamification = (
        db.query(UserGamification)
        .filter(UserGamification.user_id == current_user.id)
        .first()
    )

    if not gamification:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gamification record not found. Please contact support.",
        )

    # Check the user can afford it
    if gamification.total_points < reward.cost:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Not enough points. "
                f"You have {gamification.total_points} points but need {reward.cost}. "
                f"Complete more tasks to earn points!"
            ),
        )

    # Deduct points and mark reward as claimed
    gamification.deduct_points(reward.cost)
    reward.claimed = True
    db.commit()

    return {
        "message": f"🎉 Enjoy your reward: '{reward.name}'!",
        "reward_id": str(reward.id),
        "reward_name": reward.name,
        "points_spent": reward.cost,
        "remaining_points": gamification.total_points,
        "level": gamification.level,
    }