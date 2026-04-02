from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from models.schemas import RoleAssign, TierAssign, CustomRoleCreate
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

    # Check built-in roles first, then custom roles
    custom_role = await db.custom_roles.find_one({"role_id": data.role}, {"_id": 0})
    if data.role not in VALID_ROLES and not custom_role:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES} or a custom role")

    target = await db.users.find_one({"user_id": data.user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    role_title = data.role_title
    role_badge = data.role
    role_color = ""
    if custom_role:
        role_title = role_title or custom_role.get("label", "")
        role_badge = custom_role.get("badge_text", "") or custom_role.get("role_id", "")
        role_color = custom_role.get("color", "")

    await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {
            "role": data.role,
            "role_title": role_title,
            "role_badge": role_badge,
            "role_color": role_color,
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


# === CUSTOM ROLE MANAGEMENT ===

@router.get("/custom-roles")
async def list_custom_roles(request: Request):
    await require_admin(request)
    db = get_db(request)
    roles = await db.custom_roles.find({}, {"_id": 0}).to_list(100)
    return {"roles": roles}


@router.post("/custom-roles")
async def create_custom_role(data: CustomRoleCreate, request: Request):
    await require_admin(request)
    db = get_db(request)

    existing = await db.custom_roles.find_one({"role_id": data.role_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Role ID already exists")

    if data.role_id in VALID_ROLES + ["admin", "owner"]:
        raise HTTPException(status_code=400, detail="Cannot use built-in role names")

    now = datetime.now(timezone.utc)
    await db.custom_roles.insert_one({
        "role_id": data.role_id,
        "label": data.label,
        "color": data.color,
        "badge_text": data.badge_text or data.label,
        "permissions": data.permissions,
        "created_at": now,
    })
    return {"message": f"Custom role '{data.label}' created", "role_id": data.role_id}


@router.delete("/custom-roles/{role_id}")
async def delete_custom_role(role_id: str, request: Request):
    await require_admin(request)
    db = get_db(request)

    result = await db.custom_roles.delete_one({"role_id": role_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")

    # Reset users with this role back to 'user'
    await db.users.update_many(
        {"role": role_id},
        {"$set": {"role": "user", "role_title": "", "role_badge": "user", "role_color": "", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": f"Custom role '{role_id}' deleted"}



@router.post("/cleanup-test-data")
async def cleanup_test_data(request: Request):
    """Remove all test posts, test pets, and test users (except admins)."""
    await require_admin(request)
    db = get_db(request)

    # Delete test posts (all posts from test accounts or with test content)
    test_emails = ["freeuser@test.com", "buyer@test.com", "testuser@test.com"]
    test_users = await db.users.find({"email": {"$in": test_emails}}, {"_id": 0, "user_id": 1}).to_list(100)
    test_user_ids = [u["user_id"] for u in test_users]

    # Delete posts by test users
    post_result = await db.posts.delete_many({"author_id": {"$in": test_user_ids}})

    # Delete pets by test users
    pet_result = await db.pets.delete_many({"owner_id": {"$in": test_user_ids}})

    # Delete test users themselves
    user_result = await db.users.delete_many({"email": {"$in": test_emails}})

    # Delete all posts if admin wants a clean slate
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    if body.get("delete_all_posts"):
        all_posts = await db.posts.delete_many({})
        all_comments = await db.comments.delete_many({})
        return {
            "message": "All test data and all posts cleaned up",
            "posts_deleted": all_posts.deleted_count,
            "comments_deleted": all_comments.deleted_count,
            "pets_deleted": pet_result.deleted_count,
            "test_users_deleted": user_result.deleted_count,
        }

    return {
        "message": "Test data cleaned up",
        "posts_deleted": post_result.deleted_count,
        "pets_deleted": pet_result.deleted_count,
        "test_users_deleted": user_result.deleted_count,
    }


@router.post("/setup-breeder/{user_email}")
async def setup_breeder(user_email: str, request: Request):
    """Set up a user as an official Petbookin breeder."""
    await require_admin(request)
    db = get_db(request)
    import uuid

    body = await request.json()
    breeds = body.get("breeds", [])
    kennel_name = body.get("kennel_name", "")
    breeder_type = body.get("breeder_type", "hobby")

    user = await db.users.find_one({"email": user_email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    breeder_id = user.get("petbookin_breeder_id") or f"PBK-BR-{uuid.uuid4().hex[:8].upper()}"

    breeder_info = {
        "petbookin_breeder_id": breeder_id,
        "kennel_name": kennel_name,
        "breeds": breeds,
        "breeder_type": breeder_type,
        "is_verified": True,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "registry_status": "active",
    }

    await db.users.update_one(
        {"email": user_email},
        {"$set": {
            "petbookin_breeder_id": breeder_id,
            "breeder_info": breeder_info,
            "account_type": "breeder",
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    return {
        "message": f"Breeder credentials set for {user_email}",
        "breeder_id": breeder_id,
        "breeder_info": breeder_info,
    }
