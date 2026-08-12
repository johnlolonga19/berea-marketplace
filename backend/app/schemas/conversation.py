from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.message import MessageRead


class ConversationCreate(BaseModel):
    listing_id: int
    body: str = Field(min_length=1, max_length=4000)


class ConversationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    listing_id: int
    buyer_id: int
    seller_id: int
    created_at: datetime
    messages: list[MessageRead]


class ConversationSummary(BaseModel):
    id: int
    listing_id: int
    listing_title: str
    other_user_id: int
    other_user_name: str
    last_message: str
    last_message_at: datetime
