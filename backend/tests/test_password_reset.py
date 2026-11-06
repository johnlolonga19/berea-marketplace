from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.models.user import User
from app.routers.auth import MAX_RESET_ATTEMPTS
from tests.conftest import TestingSessionLocal

EMAIL = "alice@berea.edu"
OLD_PASSWORD = "secretpass123"
NEW_PASSWORD = "brandnewpass456"


def _request_reset(client, email=EMAIL):
    with patch("app.routers.auth.send_password_reset_code") as mock_send:
        res = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert res.status_code == 200, res.text
    return res, mock_send


def _request_code(client, email=EMAIL) -> str:
    _, mock_send = _request_reset(client, email)
    sent_email, code = mock_send.call_args.args
    assert sent_email == email
    return code


def _reset(client, code, email=EMAIL, new_password=NEW_PASSWORD):
    return client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "code": code, "new_password": new_password},
    )


def _login(client, password, email=EMAIL):
    return client.post("/api/v1/auth/login", data={"username": email, "password": password})


def _wrong(code: str) -> str:
    return "000000" if code != "000000" else "111111"


def test_reset_password_full_flow(client, auth_headers):
    auth_headers()
    code = _request_code(client)

    res = _reset(client, code)
    assert res.status_code == 200, res.text

    assert _login(client, NEW_PASSWORD).status_code == 200
    assert _login(client, OLD_PASSWORD).status_code == 401


def test_code_cannot_be_reused(client, auth_headers):
    auth_headers()
    code = _request_code(client)
    assert _reset(client, code).status_code == 200
    assert _reset(client, code, new_password="anotherpass789").status_code == 400


def test_forgot_password_unknown_email_same_response_and_no_email(client):
    res, mock_send = _request_reset(client, "ghost@berea.edu")
    mock_send.assert_not_called()
    assert "If that email is registered" in res.json()["detail"]


def test_wrong_code_rejected(client, auth_headers):
    auth_headers()
    code = _request_code(client)
    res = _reset(client, _wrong(code))
    assert res.status_code == 400
    assert res.json()["detail"] == "Invalid or expired code"
    assert _login(client, OLD_PASSWORD).status_code == 200


def test_expired_code_rejected(client, auth_headers):
    auth_headers()
    code = _request_code(client)
    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).one()
        user.password_reset_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()
    assert _reset(client, code).status_code == 400


def test_code_burned_after_too_many_wrong_attempts(client, auth_headers):
    auth_headers()
    code = _request_code(client)
    for _ in range(MAX_RESET_ATTEMPTS):
        assert _reset(client, _wrong(code)).status_code == 400
    # Even the correct code no longer works.
    assert _reset(client, code).status_code == 400
    assert _login(client, OLD_PASSWORD).status_code == 200


def test_new_request_replaces_old_code(client, auth_headers):
    auth_headers()
    first = _request_code(client)
    second = _request_code(client)
    if first != second:
        assert _reset(client, first).status_code == 400
    assert _reset(client, second).status_code == 200


def test_reset_verifies_unverified_user(client, register_user):
    register_user(email=EMAIL, password=OLD_PASSWORD)
    assert _login(client, OLD_PASSWORD).status_code == 403  # not verified yet
    code = _request_code(client)
    assert _reset(client, code).status_code == 200
    assert _login(client, NEW_PASSWORD).status_code == 200


def test_reset_rejects_short_password(client, auth_headers):
    auth_headers()
    code = _request_code(client)
    assert _reset(client, code, new_password="short").status_code == 422


def test_reset_without_request_rejected(client, auth_headers):
    auth_headers()
    assert _reset(client, "123456").status_code == 400
