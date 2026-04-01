from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from models.schemas import RoleAssign, TierAssign
from utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])

VALID_ROLES = ["user", "moderator", "manager"]
VALID_TIERS = ["free", "prime", "pro", "ultra", "mega"]


def get_db(request: Request):
    return request.app.state.db


async def require_admin(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    if not user.get("is_admin") and user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/users")
async def list_users(request: Request, page: int = 1, limit: int = 50):
    await require_admin(request)
    db = get_db(request)
    skip = (page - 1) * limit
    users = await db.users.find(
        {}, {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    return {"users": users, "total": total, "page": page}


@router.get("/stats")
async def get_stats(request: Request):
    await require_admin(request)
    db = get_db(request)

    total_users = await db.users.count_documents({})
    total_pets = await db.pets.count_documents({})
    total_posts = await db.posts.count_documents({})
    total_breeders = await db.users.count_documents({"breeder_info": {"$ne": None}})
    verified_breeders = await db.users.count_documents({"breeder_info.is_verified": True})

    tier_counts = {}
    for tier in VALID_TIERS:
        tier_counts[tier] = await db.users.count_documents({"membership_tier": tier})

    return {
        "total_users": total_users,
        "total_pets": total_pets,
        "total_posts": total_posts,
        "total_breeders": total_breeders,
        "verified_breeders": verified_breeders,
        "tier_counts": tier_counts
    }


@router.post("/assign-role")
async def assign_role(data: RoleAssign, request: Request):
    admin = await require_admin(request)
    db = get_db(request)

    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES}")

    target = await db.users.find_one({"user_id": data.user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {
            "role": data.role,
            "role_title": data.role_title,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    return {"message": f"Role '{data.role}' assigned to {target['name']}"}


@router.post("/assign-tier")
async def assign_tier(data: TierAssign, request: Request):
    admin = await require_admin(request)
    db = get_db(request)

    if data.tier not in VALID_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Must be one of: {VALID_TIERS}")

    target = await db.users.find_one({"user_id": data.user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {
            "membership_tier": data.tier,
            "membership_status": "active" if data.tier != "free" else "inactive",
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    return {"message": f"Tier '{data.tier}' assigned to {target['name']}"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    admin = await require_admin(request)
    db = get_db(request)

    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("is_admin"):
        raise HTTPException(status_code=403, detail="Cannot delete admin")

    await db.users.delete_one({"user_id": user_id})
    await db.pets.delete_many({"owner_id": user_id})
    await db.posts.delete_many({"author_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})

    return {"message": f"User {target['name']} deleted"}
