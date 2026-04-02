from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, List
from utils.auth import get_current_user
import uuid
import logging

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger(__name__)


def gen_id():
    return f"conv_{uuid.uuid4().hex[:12]}"


def gen_msg_id():
    return f"msg_{uuid.uuid4().hex[:12]}"


class NewConversation(BaseModel):
    participant_id: str
    type: str = "direct"
    group_name: Optional[str] = None


class SendMessage(BaseModel):
    content: str


@router.get("/contacts")
async def chat_contacts(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    users_cursor = db.users.find(
        {"user_id": {"$ne": user["user_id"]}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "membership_tier": 1, "role": 1, "role_badge": 1, "role_color": 1}
    )
    contacts = await users_cursor.to_list(200)
    return {"contacts": contacts}


@router.get("/conversations")
async def list_conversations(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    convos = await db.conversations.find(
        {"participants": user["user_id"]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(50)

    result = []
    for c in convos:
        other_ids = [p for p in c["participants"] if p != user["user_id"]]
        other_user = None
        if other_ids:
            other_user = await db.users.find_one(
                {"user_id": other_ids[0]},
                {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "membership_tier": 1}
            )

        last_msg = await db.messages.find_one(
            {"conversation_id": c["conversation_id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )

        unread = await db.messages.count_documents({
            "conversation_id": c["conversation_id"],
            "sender_id": {"$ne": user["user_id"]},
            "read_by": {"$nin": [user["user_id"]]}
        })

        result.append({
            "conversation_id": c["conversation_id"],
            "type": c.get("type", "direct"),
            "group_name": c.get("group_name"),
            "other_user": other_user,
            "last_message": last_msg,
            "unread_count": unread,
            "updated_at": c.get("updated_at"),
        })

    return {"conversations": result}


@router.post("/conversations")
async def create_or_get_conversation(data: NewConversation, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    if data.participant_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")

    other = await db.users.find_one({"user_id": data.participant_id}, {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "membership_tier": 1})
    if not other:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.conversations.find_one({
        "type": "direct",
        "participants": {"$all": [user["user_id"], data.participant_id], "$size": 2}
    }, {"_id": 0})

    if existing:
        return {**existing, "other_user": other}

    now = datetime.now(timezone.utc)
    conv = {
        "conversation_id": gen_id(),
        "type": "direct",
        "participants": [user["user_id"], data.participant_id],
        "group_name": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.conversations.insert_one(conv)
    del conv["_id"]
    return {**conv, "other_user": other}


@router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    conv = await db.conversations.find_one(
        {"conversation_id": conv_id, "participants": user["user_id"]},
        {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await db.messages.find(
        {"conversation_id": conv_id},
        {"_id": 0}
    ).sort("created_at", 1).limit(200).to_list(200)

    # Mark messages as read
    await db.messages.update_many(
        {
            "conversation_id": conv_id,
            "sender_id": {"$ne": user["user_id"]},
            "read_by": {"$nin": [user["user_id"]]}
        },
        {"$push": {"read_by": user["user_id"]}}
    )

    return {"messages": messages}


@router.post("/conversations/{conv_id}/messages")
async def send_message(conv_id: str, data: SendMessage, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    conv = await db.conversations.find_one(
        {"conversation_id": conv_id, "participants": user["user_id"]},
        {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    now = datetime.now(timezone.utc)
    msg = {
        "message_id": gen_msg_id(),
        "conversation_id": conv_id,
        "sender_id": user["user_id"],
        "sender_name": user["name"],
        "sender_picture": user.get("picture", ""),
        "content": data.content.strip(),
        "read_by": [user["user_id"]],
        "created_at": now,
    }
    await db.messages.insert_one(msg)
    del msg["_id"]

    await db.conversations.update_one(
        {"conversation_id": conv_id},
        {"$set": {"updated_at": now}}
    )

    return msg


@router.get("/unread-count")
async def unread_count(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    convos = await db.conversations.find(
        {"participants": user["user_id"]},
        {"_id": 0, "conversation_id": 1}
    ).to_list(100)

    total = 0
    for c in convos:
        count = await db.messages.count_documents({
            "conversation_id": c["conversation_id"],
            "sender_id": {"$ne": user["user_id"]},
            "read_by": {"$nin": [user["user_id"]]}
        })
        total += count

    return {"unread_count": total}
