import resend

from app.core.config import get_settings

settings = get_settings()

resend.api_key = settings.resend_api_key


def send_verification_code(to_email: str, code: str) -> None:
    resend.Emails.send(
        {
            "from": settings.email_from,
            "to": to_email,
            "subject": "Your Berea Marketplace verification code",
            "html": (
                f"<p>Your verification code is:</p>"
                f"<p style='font-size: 28px; font-weight: bold; letter-spacing: 4px;'>{code}</p>"
                f"<p>This code expires in {settings.verification_code_expire_minutes} minutes.</p>"
            ),
        }
    )
