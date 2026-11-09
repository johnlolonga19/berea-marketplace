from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.conversation import Conversation
from app.models.listing import Listing
from app.models.message import Message
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    UnreadCount,
)
from app.schemas.message import MessageCreate, MessageRead, MessageStatus

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _as_utc(value: datetime) -> datetime:
    # SQLite (tests) drops tzinfo; we only ever store UTC, so naive means UTC.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _unread_count(conversation: Conversation, user: User) -> int:
    is_buyer = conversation.buyer_id == user.id
    last_read = conversation.buyer_last_read_at if is_buyer else conversation.seller_last_read_at
    return sum(
        1
        for m in conversation.messages
        if m.sender_id != user.id
        and (last_read is None or _as_utc(m.created_at) > _as_utc(last_read))
    )


def _mark_read(conversation: Conversation, user: User) -> None:
    now = datetime.now(timezone.utc)
    if conversation.buyer_id == user.id:
        conversation.buyer_last_read_at = now
    else:
        conversation.seller_last_read_at = now


def _touch(user: User) -> None:
    """Record that this user's app just checked in (drives "Delivered" receipts)."""
    user.last_active_at = datetime.now(timezone.utc)


def _user_conversations(db: Session, user: User) -> list[Conversation]:
    return (
        db.query(Conversation)
        .filter(or_(Conversation.buyer_id == user.id, Conversation.seller_id == user.id))
        .all()
    )


def _status(message: Message, conversation: Conversation, viewer: User) -> MessageStatus | None:
    if message.sender_id != viewer.id:
        return None
    if conversation.buyer_id == viewer.id:
        other, other_read_at = conversation.seller, conversation.seller_last_read_at
    else:
        other, other_read_at = conversation.buyer, conversation.buyer_last_read_at
    sent_at = _as_utc(message.created_at)
    if other_read_at is not None and _as_utc(other_read_at) >= sent_at:
        return "read"
    if other.last_active_at is not None and _as_utc(other.last_active_at) >= sent_at:
        return "delivered"
    return "sent"


def _message_read(message: Message, conversation: Conversation, viewer: User) -> MessageRead:
    out = MessageRead.model_validate(message)
    out.status = _status(message, conversation, viewer)
    return out


def _to_detail(conversation: Conversation, viewer: User) -> ConversationDetail:
    return ConversationDetail(
        id=conversation.id,
        listing_id=conversation.listing_id,
        listing_title=conversation.listing.title,
        buyer_id=conversation.buyer_id,
        buyer_name=conversation.buyer.full_name,
        seller_id=conversation.seller_id,
        seller_name=conversation.seller.full_name,
        created_at=conversation.created_at,
        messages=[_message_read(m, conversation, viewer) for m in conversation.messages],
    )


def get_participant_conversation(
    conversation_id: int, db: Session, current_user: User
) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user.id not in (conversation.buyer_id, conversation.seller_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant in this conversation"
        )
    return conversation


@router.post("", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
def start_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ConversationDetail:
    listing = db.get(Listing, payload.listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't message yourself about your own listing",
        )

    conversation = (
        db.query(Conversation)
        .filter(Conversation.listing_id == listing.id, Conversation.buyer_id == current_user.id)
        .first()
    )
    if conversation is None:
        conversation = Conversation(
            listing_id=listing.id, buyer_id=current_user.id, seller_id=listing.owner_id
        )
        db.add(conversation)
        db.flush()

    db.add(Message(conversation_id=conversation.id, sender_id=current_user.id, body=payload.body))
    _mark_read(conversation, current_user)
    _touch(current_user)
    db.commit()
    db.refresh(conversation)
    return _to_detail(conversation, current_user)


@router.get("", response_model=list[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
) -> list[ConversationSummary]:
    _touch(current_user)
    db.commit()
    summaries: list[ConversationSummary] = []
    for conversation in _user_conversations(db, current_user):
        if not conversation.messages:
            continue
        last_message = conversation.messages[-1]
        other_user = (
            conversation.seller if conversation.buyer_id == current_user.id else conversation.buyer
        )
        summaries.append(
            ConversationSummary(
                id=conversation.id,
                listing_id=conversation.listing_id,
                listing_title=conversation.listing.title,
                other_user_id=other_user.id,
                other_user_name=other_user.full_name,
                last_message=last_message.body,
                last_message_at=last_message.created_at,
                unread_count=_unread_count(conversation, current_user),
            )
        )

    summaries.sort(key=lambda s: s.last_message_at, reverse=True)
    return summaries


# Declared before /{conversation_id} so "unread-count" isn't parsed as an id.
@router.get("/unread-count", response_model=UnreadCount)
def unread_count(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
) -> UnreadCount:
    # Polled by the nav badge whenever the app is open, so this is what marks
    # incoming messages "Delivered" for their senders.
    _touch(current_user)
    db.commit()
    count = sum(
        1 for c in _user_conversations(db, current_user) if _unread_count(c, current_user) > 0
    )
    return UnreadCount(conversations=count)


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ConversationDetail:
    conversation = get_participant_conversation(conversation_id, db, current_user)
    # Opening the thread counts as reading it.
    _mark_read(conversation, current_user)
    _touch(current_user)
    db.commit()
    db.refresh(conversation)
    return _to_detail(conversation, current_user)


@router.post("/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> MessageRead:
    conversation = get_participant_conversation(conversation_id, db, current_user)
    message = Message(conversation_id=conversation.id, sender_id=current_user.id, body=payload.body)
    db.add(message)
    _mark_read(conversation, current_user)
    _touch(current_user)
    db.commit()
    db.refresh(message)
    return _message_read(message, conversation, current_user)
