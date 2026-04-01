from fastapi import APIRouter, Request, Query
from utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


def get_db(request: Request):
    return request.app.state.db


@router.get("")
async def search(request: Request, q: str = Query("", min_length=1), type: str = "all", page: int = 1, limit: int = 20):
    db = get_db(request)
    skip = (page - 1) * limit
    results = {"pets": [], "users": [], "breeders": [], "posts": []}

    if not q:
        return results

    regex = {"$regex": q, "$options": "i"}

    if type in ["all", "pets"]:
        pets = await db.pets.find(
            {"$or": [{"name": regex}, {"breed": regex}, {"species": regex}]},
            {"_id": 0}
        ).skip(skip).limit(limit).to_list(limit)
        results["pets"] = pets

    if type in ["all", "users"]:
        users = await db.users.find(
            {"$or": [{"name": regex}, {"email": regex}]},
            {"_id": 0, "password_hash": 0}
        ).skip(skip).limit(limit).to_list(limit)
        results["users"] = users

    if type in ["all", "breeders"]:
        breeders = await db.users.find(
            {"breeder_info": {"$ne": None}, "$or": [{"name": regex}, {"breeder_info.kennel_name": regex}]},
            {"_id": 0, "password_hash": 0}
        ).skip(skip).limit(limit).to_list(limit)
        results["breeders"] = breeders

    if type in ["all", "posts"]:
        posts = await db.posts.find(
            {"content": regex},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        results["posts"] = posts

    return results
