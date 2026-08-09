from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.deps import get_current_active_user
from app.models.user import User
from app.services.cloudinary_service import upload_image

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


@router.post("/image")
async def upload_listing_image(
    file: UploadFile, current_user: User = Depends(get_current_active_user)
) -> dict[str, str]:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type, must be JPEG, PNG, or WEBP",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large (max 5MB)"
        )

    url = upload_image(contents)
    return {"url": url}
