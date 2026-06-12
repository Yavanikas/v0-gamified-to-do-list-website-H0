"""
app/api/deps.py
---------------
Shared FastAPI dependencies used across all routers.

The most important one is get_current_user().
Every protected endpoint (tasks, rewards, etc.) uses this to:
  1. Read the JWT token from the request header
  2. Decode it to find out who the user is
  3. Load that user from the database
  4. Return the user object so the route can use it

If the token is missing or invalid, it automatically returns a 401 error
and the route never runs. This is how we protect private data.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.database.connection import get_db
from app.models.user import User
from app.config import SECRET_KEY, ALGORITHM

# This tells FastAPI to look for a Bearer token in the Authorization header.
# Example header the frontend sends:
#   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the JWT token and return the logged-in User object.

    Used as a dependency in any route that requires login:
        @router.get("/tasks")
        def list_tasks(current_user: User = Depends(get_current_user)):
            ...
    """
    token = credentials.credentials  # The raw token string

    # This error is returned if anything goes wrong with the token
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode the token using our secret key
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # The token payload contains the user's ID
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_error

    except JWTError:
        # Token is malformed, expired, or tampered with
        raise credentials_error

    # Look up the user in the database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_error

    return user
