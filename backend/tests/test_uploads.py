from unittest.mock import patch


def test_upload_requires_auth(client):
    res = client.post(
        "/api/v1/uploads/image",
        files={"file": ("a.jpg", b"fakejpegbytes", "image/jpeg")},
    )
    assert res.status_code == 401


def test_upload_rejects_bad_content_type(client, auth_headers):
    headers = auth_headers()
    res = client.post(
        "/api/v1/uploads/image",
        files={"file": ("a.txt", b"not an image", "text/plain")},
        headers=headers,
    )
    assert res.status_code == 400


def test_upload_rejects_oversized_file(client, auth_headers):
    headers = auth_headers()
    big = b"0" * (6 * 1024 * 1024)
    res = client.post(
        "/api/v1/uploads/image",
        files={"file": ("big.jpg", big, "image/jpeg")},
        headers=headers,
    )
    assert res.status_code == 400


def test_upload_success(client, auth_headers):
    headers = auth_headers()
    with patch("app.services.cloudinary_service.cloudinary.uploader.upload") as mock_upload:
        mock_upload.return_value = {"secure_url": "https://res.cloudinary.com/demo/fake.jpg"}
        res = client.post(
            "/api/v1/uploads/image",
            files={"file": ("good.jpg", b"realjpegbytes", "image/jpeg")},
            headers=headers,
        )
    assert res.status_code == 200
    assert res.json() == {"url": "https://res.cloudinary.com/demo/fake.jpg"}
    assert mock_upload.call_args.kwargs.get("folder") == "berea-marketplace"
