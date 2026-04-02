from fastapi import APIRouter, HTTPException, Request
from datetime import timedelta
from datetime import datetime, timezone
from models.schemas import PostCreate, CommentCreate
from utils.auth import get_current_user, generate_post_id, generate_comment_id
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feed", tags=["Feed"])

TIER_ORDER = ["free", "prime", "pro", "ultra", "mega"]
MEDIA_CREATE_TIERS = {
    "video": ["ultra", "mega"],
    "audio": ["pro", "ultra", "mega"],
}


def get_db(request: Request):
    return request.app.state.db


@router.post("/posts")
async def create_post(data: PostCreate, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    now = datetime.now(timezone.utc)

    post_type = data.post_type or "text"
    if post_type in MEDIA_CREATE_TIERS:
        user_tier = user.get("membership_tier", "free")
        if user_tier not in MEDIA_CREATE_TIERS[post_type]:
            allowed = ", ".join(t.capitalize() for t in MEDIA_CREATE_TIERS[post_type])
            raise HTTPException(
                status_code=403,
                detail=f"{post_type.capitalize()} posts require {allowed} tier or higher"
            )
        if not data.media_url:
            raise HTTPException(status_code=400, detail=f"Media URL required for {post_type} posts")

    post_doc = {
        "post_id": generate_post_id(),
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_picture": user.get("picture", ""),
        "author_tier": user.get("membership_tier", "free"),
        "pet_id": data.pet_id,
        "content": data.content,
        "post_type": post_type,
        "media_url": data.media_url or "",
        "media": [],
        "likes": [],
        "likes_count": 0,
        "comments_count": 0,
        "is_promoted": False,
        "created_at": now
    }

    # Attach pet info if pet_id provided
    if data.pet_id:
        pet = await db.pets.find_one({"pet_id": data.pet_id}, {"_id": 0})
        if pet:
            post_doc["pet_name"] = pet["name"]
            post_doc["pet_species"] = pet.get("species", "")
            post_doc["pet_breed"] = pet.get("breed", "")
            post_doc["pet_photo"] = pet["photos"][0] if pet.get("photos") else ""

    await db.posts.insert_one(post_doc)
    return await db.posts.find_one({"post_id": post_doc["post_id"]}, {"_id": 0})


@router.get("/posts")
async def get_posts(request: Request, page: int = 1, limit: int = 20):
    db = get_db(request)
    skip = (page - 1) * limit

    # Get blocked user IDs for current user
    blocked_ids = []
    try:
        user = await get_current_user(request, db)
        blocked = await db.blocked_users.find(
            {"blocker_id": user["user_id"]}, {"_id": 0, "blocked_id": 1}
        ).to_list(500)
        blocked_ids = [b["blocked_id"] for b in blocked]
    except Exception:
        pass

    query = {"author_id": {"$nin": blocked_ids}} if blocked_ids else {}

    posts = await db.posts.find(
        query, {"_id": 0}
    ).sort([("is_promoted", -1), ("created_at", -1)]).skip(skip).limit(limit).to_list(limit)

    total = await db.posts.count_documents(query)
    return {
        "posts": posts,
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit)
    }


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = user["user_id"]
    if user_id in post.get("likes", []):
        await db.posts.update_one(
            {"post_id": post_id},
            {"$pull": {"likes": user_id}, "$inc": {"likes_count": -1}}
        )
        return {"liked": False}
    else:
        await db.posts.update_one(
            {"post_id": post_id},
            {"$push": {"likes": user_id}, "$inc": {"likes_count": 1}}
        )
        return {"liked": True}


@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str, request: Request):
    db = get_db(request)
    comments = await db.comments.find(
        {"post_id": post_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return comments


@router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, data: CommentCreate, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    now = datetime.now(timezone.utc)
    comment_doc = {
        "comment_id": generate_comment_id(),
        "post_id": post_id,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_picture": user.get("picture", ""),
        "content": data.content,
        "created_at": now
    }
    await db.comments.insert_one(comment_doc)
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"comments_count": 1}})
    return await db.comments.find_one({"comment_id": comment_doc["comment_id"]}, {"_id": 0})


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["author_id"] != user["user_id"] and user.get("role") not in ["admin", "owner", "moderator"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.posts.delete_one({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"message": "Post deleted"}


@router.get("/pet-of-the-week")
async def pet_of_the_week(request: Request):
    db = get_db(request)
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # Find posts from the last week, sorted by likes count
    top_posts = await db.posts.find(
        {"created_at": {"$gte": one_week_ago}, "pet_id": {"$ne": None}},
        {"_id": 0}
    ).sort("likes_count", -1).limit(1).to_list(1)

    if not top_posts:
        # Fallback: most liked pet post of all time
        top_posts = await db.posts.find(
            {"pet_id": {"$ne": None}},
            {"_id": 0}
        ).sort("likes_count", -1).limit(1).to_list(1)

    if not top_posts:
        return {"pet": None, "post": None}

    post = top_posts[0]
    pet = await db.pets.find_one({"pet_id": post["pet_id"]}, {"_id": 0})
    if not pet:
        return {"pet": None, "post": None}

    owner = await db.users.find_one({"user_id": pet["owner_id"]}, {"_id": 0, "password_hash": 0})

    return {
        "pet": pet,
        "post": post,
        "owner": {
            "name": owner["name"] if owner else "Unknown",
            "user_id": owner["user_id"] if owner else "",
            "membership_tier": owner.get("membership_tier", "free") if owner else "free",
            "breeder_info": owner.get("breeder_info") if owner else None,
        }
    }
