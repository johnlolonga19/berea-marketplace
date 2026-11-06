from pydantic import BaseModel, EmailStr, Field


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    # Same rules as UserCreate.password (bcrypt only uses the first 72 bytes).
    new_password: str = Field(min_length=8, max_length=72)
