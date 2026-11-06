import json
import logging
import urllib.error
import urllib.request

from app.core.config import get_settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def send_verification_code(to_email: str, code: str) -> None:
    """Send a verification code via Brevo's transactional email API.

    Raises on failure so callers can decide whether to surface the error.
    """
    settings = get_settings()
    payload = {
        "sender": {"name": settings.email_from_name, "email": settings.email_from},
        "to": [{"email": to_email}],
        "subject": "Your Berea Marketplace verification code",
        "htmlContent": (
            f"<p>Your verification code is:</p>"
            f"<p style='font-size: 28px; font-weight: bold; letter-spacing: 4px;'>{code}</p>"
            f"<p>This code expires in {settings.verification_code_expire_minutes} minutes.</p>"
        ),
    }
    request = urllib.request.Request(
        BREVO_SEND_URL,
        data=json.dumps(payload).encode(),
        headers={
            "api-key": settings.brevo_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            body = response.read().decode(errors="replace")
        logger.info("Brevo accepted email to %s from %s: %s", to_email, settings.email_from, body)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        logger.error("Brevo rejected email to %s: %s %s", to_email, exc.code, body)
        raise
