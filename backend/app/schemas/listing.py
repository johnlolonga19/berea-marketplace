from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ListingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    price: Decimal = Field(gt=0, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=500)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=500)
    is_sold: bool | None = None


class ListingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    price: Decimal
    image_url: str | None
    is_sold: bool
    owner_id: int
    created_at: datetime
    updated_at: datetime
