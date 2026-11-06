import io
import json
import urllib.error
from unittest.mock import MagicMock, patch

import pytest

from app.core.config import get_settings
from app.services.email_service import BREVO_SEND_URL, send_verification_code


@pytest.fixture
def brevo_settings(monkeypatch):
    monkeypatch.setenv("BREVO_API_KEY", "test-key")
    monkeypatch.setenv("EMAIL_FROM", "sender@example.com")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_sends_code_via_brevo_api(brevo_settings):
    with patch("app.services.email_service.urllib.request.urlopen") as mock_urlopen:
        mock_urlopen.return_value.__enter__.return_value = MagicMock()
        send_verification_code("buyer@example.com", "123456")

    request = mock_urlopen.call_args.args[0]
    assert request.full_url == BREVO_SEND_URL
    assert request.get_method() == "POST"
    assert request.get_header("Api-key") == "test-key"
    body = json.loads(request.data)
    assert body["sender"]["email"] == "sender@example.com"
    assert body["to"] == [{"email": "buyer@example.com"}]
    assert "123456" in body["htmlContent"]


def test_raises_when_brevo_rejects(brevo_settings):
    error = urllib.error.HTTPError(
        BREVO_SEND_URL, 401, "Unauthorized", {}, io.BytesIO(b'{"message":"bad key"}')
    )
    with patch("app.services.email_service.urllib.request.urlopen", side_effect=error):
        with pytest.raises(urllib.error.HTTPError):
            send_verification_code("buyer@example.com", "123456")
