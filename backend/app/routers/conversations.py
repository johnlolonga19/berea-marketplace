from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.conversation import Conversation
from app.models.listing import Listing
from app.models.message import Message
from app.models.user import User
from app.schemas.conversation import ConversationCreate, ConversationDetail, ConversationSummary
from app.schemas.message import MessageCreate, MessageRead

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _to_detail(conversation: Conversation) -> ConversationDetail:
    return ConversationDetail(
        id=conversation.id,
        listing_id=conversation.listing_id,
        listing_title=conversation.listing.title,
        buyer_id=conversation.buyer_id,
        buyer_name=conversation.buyer.full_name,
        seller_id=conversation.seller_id,
        seller_name=conversation.seller.full_name,
        created_at=conversation.created_at,
        messages=[MessageRead.model_validate(m) for m in conversation.messages],
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
    db.commit()
    db.refresh(conversation)
    return _to_detail(conversation)


@router.get("", response_model=list[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
) -> list[ConversationSummary]:
    conversations = (
        db.query(Conversation)
        .filter(
            or_(Conversation.buyer_id == current_user.id, Conversation.seller_id == current_user.id)
        )
        .all()
    )

    summaries: list[ConversationSummary] = []
    for conversation in conversations:
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
            )
        )

    summaries.sort(key=lambda s: s.last_message_at, reverse=True)
    return summaries


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ConversationDetail:
    conversation = get_participant_conversation(conversation_id, db, current_user)
    return _to_detail(conversation)


@router.post("/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Message:
    conversation = get_participant_conversation(conversation_id, db, current_user)
    message = Message(conversation_id=conversation.id, sender_id=current_user.id, body=payload.body)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
