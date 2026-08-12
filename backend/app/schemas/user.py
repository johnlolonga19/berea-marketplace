from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.config import get_settings


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def email_must_be_allowed_domain(cls, value: str) -> str:
        domain = get_settings().allowed_email_domain
        if not value.lower().endswith(f"@{domain}"):
            raise ValueError(f"Email must be a @{domain} address")
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    is_verified: bool
    created_at: datetime
