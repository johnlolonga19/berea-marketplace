from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.security import (
    create_access_token,
    generate_verification_code,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserRead
from app.schemas.verification import ResendCodeRequest, VerifyCodeRequest
from app.services.email_service import send_verification_code

router = APIRouter(prefix="/auth", tags=["auth"])

settings = get_settings()


def _is_expired(expires_at: datetime) -> bool:
    # SQLite (used in tests) doesn't preserve tzinfo on DateTime(timezone=True)
    # columns, so a value we wrote as UTC can come back naive. We only ever
    # write aware UTC datetimes ourselves, so it's safe to assume UTC here.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)


def _issue_code(user: User) -> str:
    code = generate_verification_code()
    user.verification_code = code
    user.verification_code_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.verification_code_expire_minutes
    )
    return code


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
    )
    code = _issue_code(user)
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        send_verification_code(user.email, code)
    except Exception:
        # Registration itself succeeded; don't fail the request just because the
        # email couldn't be sent. The user can request a new code via /resend-code.
        pass

    return user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    user = db.query(User).filter(User.email == form_data.username).first()
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token)


@router.post("/verify-code", response_model=Token)
def verify_code(payload: VerifyCodeRequest, db: Session = Depends(get_db)) -> Token:
    user = db.query(User).filter(User.email == payload.email).first()
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code"
    )
    if user is None or user.is_verified:
        raise invalid
    if (
        user.verification_code is None
        or user.verification_code != payload.code
        or user.verification_code_expires_at is None
        or _is_expired(user.verification_code_expires_at)
    ):
        raise invalid

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    db.commit()

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token)


@router.post("/resend-code")
def resend_code(payload: ResendCodeRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None and not user.is_verified:
        code = _issue_code(user)
        db.commit()
        try:
            send_verification_code(user.email, code)
        except Exception:
            pass

    return {
        "detail": "If that email is registered and not yet verified, a new code has been sent."
    }


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user
