from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from utils.auth import get_current_user
import uuid
import logging

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger(__name__)


@router.post("/block/{target_user_id}")
async def block_user(target_user_id: str, request: Request):
    """Block a user (silent — they won't know)."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    if target_user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    await db.blocked_users.update_one(
        {"blocker_id": user["user_id"], "blocked_id": target_user_id},
        {"$set": {
            "blocker_id": user["user_id"],
            "blocked_id": target_user_id,
            "blocked_name": target.get("name", ""),
            "blocked_email": target.get("email", ""),
            "created_at": now,
        }},
        upsert=True
    )

    # Notify admin only (user is admin@petbookin.com or dedape1985@gmail.com)
    admin_emails = ["admin@petbookin.com", "dedape1985@gmail.com"]
    for email in admin_emails:
        admin = await db.users.find_one({"email": email}, {"_id": 0})
        if admin:
            await db.notifications.insert_one({
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": admin["user_id"],
                "type": "user_blocked",
                "title": "User Blocked",
                "message": f'{user.get("name", "A user")} blocked {target.get("name", "someone")}',
                "read": False,
                "created_at": now,
            })

    logger.info(f"User {user['user_id']} blocked {target_user_id}")
    return {"status": "blocked", "blocked_id": target_user_id}


@router.delete("/block/{target_user_id}")
async def unblock_user(target_user_id: str, request: Request):
    """Unblock a user."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    result = await db.blocked_users.delete_one(
        {"blocker_id": user["user_id"], "blocked_id": target_user_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User was not blocked")

    return {"status": "unblocked", "unblocked_id": target_user_id}


@router.get("/blocked")
async def list_blocked_users(request: Request):
    """Get list of users you've blocked."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    blocked = await db.blocked_users.find(
        {"blocker_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return {"blocked_users": blocked}


@router.get("/blocked-ids")
async def get_blocked_ids(request: Request):
    """Get just the IDs of blocked users (for filtering)."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    blocked = await db.blocked_users.find(
        {"blocker_id": user["user_id"]},
        {"_id": 0, "blocked_id": 1}
    ).to_list(500)

    return {"blocked_ids": [b["blocked_id"] for b in blocked]}


@router.post("/report")
async def report_content(request: Request):
    """Report a user or post to admins."""
    db = request.app.state.db
    user = await get_current_user(request, db)
    body = await request.json()

    report_type = body.get("report_type", "user")  # user, post, listing
    target_id = body.get("target_id", "")
    reason = body.get("reason", "").strip()
    details = body.get("details", "").strip()

    if not target_id:
        raise HTTPException(status_code=400, detail="Target ID required")
    if not reason:
        raise HTTPException(status_code=400, detail="Reason required")

    now = datetime.now(timezone.utc)
    report = {
        "report_id": f"rpt_{uuid.uuid4().hex[:12]}",
        "reporter_id": user["user_id"],
        "reporter_name": user.get("name", ""),
        "reporter_email": user.get("email", ""),
        "report_type": report_type,
        "target_id": target_id,
        "reason": reason,
        "details": details,
        "status": "pending",
        "created_at": now,
    }

    # Enrich with target info
    if report_type == "user":
        target = await db.users.find_one({"user_id": target_id}, {"_id": 0})
        if target:
            report["target_name"] = target.get("name", "")
            report["target_email"] = target.get("email", "")
    elif report_type == "post":
        post = await db.posts.find_one({"post_id": target_id}, {"_id": 0})
        if post:
            report["target_content"] = post.get("content", "")[:200]
            report["target_author_id"] = post.get("author_id", "")

    await db.reports.insert_one(report)

    # Notify all admins
    admins = await db.users.find({"is_admin": True}, {"_id": 0}).to_list(10)
    for admin in admins:
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": admin["user_id"],
            "type": "new_report",
            "title": f"New {report_type.title()} Report",
            "message": f'{user.get("name")} reported a {report_type}: {reason}',
            "read": False,
            "created_at": now,
        })

    report.pop("_id", None)
    logger.info(f"Report filed: {report['report_id']} by {user['user_id']}")
    return report


# ─── Admin: Reports Queue ───

@router.get("/admin/reports")
async def admin_get_reports(request: Request):
    """Admin: view all reports."""
    db = request.app.state.db
    user = await get_current_user(request, db)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")

    status_filter = request.query_params.get("status", "pending")
    query = {} if status_filter == "all" else {"status": status_filter}

    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return {"reports": reports, "total": len(reports)}


@router.post("/admin/reports/{report_id}/resolve")
async def admin_resolve_report(report_id: str, request: Request):
    """Admin: resolve a report."""
    db = request.app.state.db
    user = await get_current_user(request, db)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")

    body = await request.json()
    action = body.get("action", "dismiss")  # dismiss, warn, ban

    now = datetime.now(timezone.utc)
    result = await db.reports.update_one(
        {"report_id": report_id},
        {"$set": {
            "status": "resolved",
            "resolved_by": user["user_id"],
            "resolution": action,
            "resolved_at": now,
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")

    return {"status": "resolved", "action": action}
