"""
app/api/auth.py
---------------
Authentication endpoints.

POST /api/register  — create a new account
POST /api/login     — log in and get a JWT token

How JWT tokens work (simple version):
  1. User logs in with email + password
  2. Server checks the password, then creates a "token" — a signed string
     that proves who the user is (like a wristband at a concert)
  3. Frontend saves this token in localStorage
  4. Every future request sends the token in the header
  5. Server reads the token to know who is making the request
     (no need to send password every time)
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
import bcrypt
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_DAYS
from app.database.connection import get_db
from app.models.gamification import UserGamification
from app.models.user import User

router = APIRouter()

# ── Password hashing ──────────────────────────────────────────────────────────
# bcrypt scrambles passwords so they can never be read, even from the database.

def hash_password(plain_password: str) -> str:
    """Turn 'mypassword123' into a scrambled hash like '$2b$12$...'"""
    pwd_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the typed password matches the stored hash. Returns True/False."""
    pwd_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    """
    Create a JWT token containing the user's ID.
    The token expires after ACCESS_TOKEN_EXPIRE_DAYS days (default: 7).
    """
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "user_id": user_id,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── Request body schemas ──────────────────────────────────────────────────────
# These define exactly what JSON the frontend must send.
# Pydantic automatically validates the data and returns a clear error if
# something is missing or the wrong type.

class RegisterRequest(BaseModel):
    email: EmailStr        # Validates it looks like an email
    username: str
    password: str

    class Config:
        # Example shown in Swagger UI docs
        json_schema_extra = {
            "example": {
                "email": "player@example.com",
                "username": "player1",
                "password": "securepassword123",
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "player@example.com",
                "password": "securepassword123",
            }
        }


# ── Response schemas ──────────────────────────────────────────────────────────
# These define what the API sends back to the frontend.

class AuthResponse(BaseModel):
    id: str
    email: str
    username: str
    token: str
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account",
)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """
    Create a new user account.

    - Checks email is not already taken
    - Checks username is not already taken
    - Hashes the password (never stores the plain text)
    - Creates a gamification record (starts at 0 points, level 1)
    - Returns a JWT token so the user is immediately logged in
    """

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # Check if username already exists
    existing_username = db.query(User).filter(User.username == data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken. Please choose another.",
        )

    # Validate password length
    if len(data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    # Create the user (password is hashed — never stored as plain text)
    new_user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
    )
    db.add(new_user)
    db.flush()  # flush so new_user.id is available before we create gamification

    # Every user starts with 0 points and level 1
    gamification = UserGamification(user_id=new_user.id)
    db.add(gamification)

    db.commit()
    db.refresh(new_user)

    # Create and return the token
    token = create_access_token(str(new_user.id))

    return AuthResponse(
        id=str(new_user.id),
        email=new_user.email,
        username=new_user.username,
        token=token,
        message=f"Welcome to Gamified To-Do, {new_user.username}! 🎉",
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Log in and receive a JWT token",
)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Log in with email and password.

    - Finds the user by email
    - Verifies the password against the stored hash
    - Returns a fresh JWT token

    The frontend stores this token and sends it with every future request.
    """

    # Find the user by email
    user = db.query(User).filter(User.email == data.email).first()

    # Use a generic error message — don't reveal whether the email exists
    # (security best practice: don't help attackers guess emails)
    invalid_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )

    if not user:
        raise invalid_error

    # Check the password
    if not verify_password(data.password, user.password_hash):
        raise invalid_error

    token = create_access_token(str(user.id))

    return AuthResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        token=token,
        message=f"Welcome back, {user.username}! 👋",
    )
