import json
import logging
import urllib.error
import urllib.request

from app.core.config import get_settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def _code_html(intro: str, code: str, footer: str = "") -> str:
    settings = get_settings()
    return (
        f"<p>{intro}</p>"
        f"<p style='font-size: 28px; font-weight: bold; letter-spacing: 4px;'>{code}</p>"
        f"<p>This code expires in {settings.verification_code_expire_minutes} minutes.</p>"
        f"{footer}"
    )


def send_verification_code(to_email: str, code: str) -> None:
    _send_email(
        to_email,
        "Your Berea Marketplace verification code",
        _code_html("Your verification code is:", code),
    )


def send_password_reset_code(to_email: str, code: str) -> None:
    _send_email(
        to_email,
        "Reset your Berea Marketplace password",
        _code_html(
            "Use this code to reset your password:",
            code,
            "<p>If you didn't ask to reset your password, you can ignore this email.</p>",
        ),
    )


def _send_email(to_email: str, subject: str, html: str) -> None:
    """Send an email via Brevo's transactional email API.

    Raises on failure so callers can decide whether to surface the error.
    """
    settings = get_settings()
    payload = {
        "sender": {"name": settings.email_from_name, "email": settings.email_from},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
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
