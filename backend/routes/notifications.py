from fastapi import APIRouter, Request
from datetime import datetime, timezone
from utils.auth import get_current_user
import uuid
import logging

router = APIRouter(prefix="/notifications", tags=["Notifications"])
logger = logging.getLogger(__name__)


def gen_notif_id():
    return f"notif_{uuid.uuid4().hex[:12]}"


@router.get("")
async def get_notifications(request: Request, limit: int = 30):
    db = request.app.state.db
    user = await get_current_user(request, db)

    notifs = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    unread = await db.notifications.count_documents(
        {"user_id": user["user_id"], "read": False}
    )

    return {"notifications": notifs, "unread_count": unread}


@router.post("/mark-read")
async def mark_all_read(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}


@router.post("/mark-read/{notif_id}")
async def mark_one_read(notif_id: str, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    await db.notifications.update_one(
        {"notification_id": notif_id, "user_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}


# Helper function to create notifications (called from other routes)
async def create_notification(db, user_id: str, type: str, title: str, body: str, link: str = "", icon: str = "bell"):
    now = datetime.now(timezone.utc)
    notif = {
        "notification_id": gen_notif_id(),
        "user_id": user_id,
        "type": type,
        "title": title,
        "body": body,
        "link": link,
        "icon": icon,
        "read": False,
        "created_at": now,
    }
    await db.notifications.insert_one(notif)
    return notif
