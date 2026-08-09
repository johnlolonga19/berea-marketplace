import cloudinary
import cloudinary.uploader

from app.core.config import get_settings

settings = get_settings()

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


def upload_image(contents: bytes, folder: str = "berea-marketplace") -> str:
    result = cloudinary.uploader.upload(contents, folder=folder)
    return result["secure_url"]
