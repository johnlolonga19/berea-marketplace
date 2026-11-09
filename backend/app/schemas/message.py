from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Receipt for a message the viewer sent: "sent" (stored), "delivered" (the
# recipient's app has checked in since), "read" (they opened the thread since).
MessageStatus = Literal["sent", "delivered", "read"]


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    body: str
    created_at: datetime
    # Only set on the viewer's own messages; None for messages they received.
    status: MessageStatus | None = None
