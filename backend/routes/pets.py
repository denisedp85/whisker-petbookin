from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from datetime import datetime, timezone
from models.schemas import PetCreate, PetUpdate
from utils.auth import get_current_user, generate_pet_id
from utils.storage import put_object
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pets", tags=["Pets"])


def get_db(request: Request):
    return request.app.state.db


@router.post("")
async def create_pet(data: PetCreate, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    now = datetime.now(timezone.utc)

    pet_doc = {
        "pet_id": generate_pet_id(),
        "owner_id": user["user_id"],
        "name": data.name,
        "species": data.species,
        "breed": data.breed,
        "age": data.age,
        "bio": data.bio,
        "gender": data.gender,
        "photos": [],
        "verified_breeder": False,
        "likes_count": 0,
        "created_at": now,
        "updated_at": now
    }
    await db.pets.insert_one(pet_doc)
    return await db.pets.find_one({"pet_id": pet_doc["pet_id"]}, {"_id": 0})


@router.get("/mine")
async def get_my_pets(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    pets = await db.pets.find(
        {"owner_id": user["user_id"]}, {"_id": 0}
    ).to_list(100)
    return pets


@router.get("/{pet_id}")
async def get_pet(pet_id: str, request: Request):
    db = get_db(request)
    pet = await db.pets.find_one({"pet_id": pet_id}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    owner = await db.users.find_one({"user_id": pet["owner_id"]}, {"_id": 0})
    owner_info = None
    if owner:
        owner_info = {
            "user_id": owner["user_id"],
            "name": owner["name"],
            "picture": owner.get("picture", ""),
            "breeder_info": owner.get("breeder_info"),
            "membership_tier": owner.get("membership_tier", "free"),
            "profile_theme": owner.get("profile_theme", {})
        }
    return {**pet, "owner": owner_info}


@router.put("/{pet_id}")
async def update_pet(pet_id: str, data: PetUpdate, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    pet = await db.pets.find_one({"pet_id": pet_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found or not yours")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        await db.pets.update_one({"pet_id": pet_id}, {"$set": updates})
    return await db.pets.find_one({"pet_id": pet_id}, {"_id": 0})


@router.delete("/{pet_id}")
async def delete_pet(pet_id: str, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    pet = await db.pets.find_one({"pet_id": pet_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found or not yours")
    await db.pets.delete_one({"pet_id": pet_id})
    return {"message": "Pet deleted"}


@router.post("/{pet_id}/photo")
async def upload_pet_photo(pet_id: str, request: Request, file: UploadFile = File(...)):
    db = get_db(request)
    user = await get_current_user(request, db)
    pet = await db.pets.find_one({"pet_id": pet_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found or not yours")

    content = await file.read()
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    path = f"pets/{pet_id}/{generate_pet_id()}.{ext}"

    result = put_object(path, content, file.content_type or "image/jpeg")
    photo_url = result.get("url", path)

    await db.pets.update_one(
        {"pet_id": pet_id},
        {"$push": {"photos": photo_url}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    return {"photo_url": photo_url}



@router.get("/{pet_id}/posts")
async def get_pet_posts(pet_id: str, request: Request, page: int = 1, limit: int = 20):
    """Get posts for a specific pet"""
    db = get_db(request)
    skip = (page - 1) * limit
    
    posts = await db.posts.find(
        {"pet_id": pet_id}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return posts
