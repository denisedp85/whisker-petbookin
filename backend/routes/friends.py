"""
Friends routes for pet friendships
"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from utils.auth import get_current_user
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/friends", tags=["Friends"])


def get_db(request: Request):
    return request.app.state.db


@router.get("/{pet_id}")
async def get_pet_friends(pet_id: str, request: Request):
    """Get friends list for a pet"""
    db = get_db(request)
    
    # Find all accepted friendships where this pet is involved
    friendships = await db.friendships.find({
        "$or": [
            {"requester_pet_id": pet_id, "status": "accepted"},
            {"receiver_pet_id": pet_id, "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(100)
    
    # Get friend pet IDs
    friend_ids = []
    for f in friendships:
        if f["requester_pet_id"] == pet_id:
            friend_ids.append(f["receiver_pet_id"])
        else:
            friend_ids.append(f["requester_pet_id"])
    
    # Get friend pet details
    friends = []
    for fid in friend_ids:
        pet = await db.pets.find_one({"pet_id": fid}, {"_id": 0})
        if pet:
            friends.append({
                "pet_id": pet["pet_id"],
                "name": pet["name"],
                "species": pet.get("species", ""),
                "breed": pet.get("breed", ""),
                "profile_photo": pet.get("profile_photo", "")
            })
    
    return friends


@router.get("/status/{pet_id}")
async def get_friendship_status(pet_id: str, request: Request):
    """Get friendship status between current user's active pet and target pet"""
    db = get_db(request)
    user = await get_current_user(request, db)
    
    # Get user's pets
    my_pets = await db.pets.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(10)
    if not my_pets:
        return {"status": "none"}
    
    my_pet_ids = [p["pet_id"] for p in my_pets]
    
    # Check if any of user's pets have a friendship with target pet
    friendship = await db.friendships.find_one({
        "$or": [
            {"requester_pet_id": {"$in": my_pet_ids}, "receiver_pet_id": pet_id},
            {"requester_pet_id": pet_id, "receiver_pet_id": {"$in": my_pet_ids}}
        ]
    }, {"_id": 0})
    
    if not friendship:
        return {"status": "none"}
    
    return {"status": friendship.get("status", "pending")}


@router.post("/request")
async def send_friend_request(request: Request):
    """Send a friend request from one pet to another"""
    db = get_db(request)
    user = await get_current_user(request, db)
    body = await request.json()
    
    requester_pet_id = body.get("requester_pet_id")
    receiver_pet_id = body.get("receiver_pet_id")
    
    if not requester_pet_id or not receiver_pet_id:
        raise HTTPException(status_code=400, detail="Both pet IDs required")
    
    # Verify requester pet belongs to user
    requester_pet = await db.pets.find_one(
        {"pet_id": requester_pet_id, "owner_id": user["user_id"]}, {"_id": 0}
    )
    if not requester_pet:
        raise HTTPException(status_code=403, detail="Not your pet")
    
    # Check if receiver pet exists
    receiver_pet = await db.pets.find_one({"pet_id": receiver_pet_id}, {"_id": 0})
    if not receiver_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Check if friendship already exists
    existing = await db.friendships.find_one({
        "$or": [
            {"requester_pet_id": requester_pet_id, "receiver_pet_id": receiver_pet_id},
            {"requester_pet_id": receiver_pet_id, "receiver_pet_id": requester_pet_id}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Friendship already exists")
    
    now = datetime.now(timezone.utc)
    friendship = {
        "friendship_id": f"friend_{uuid.uuid4().hex[:12]}",
        "requester_pet_id": requester_pet_id,
        "receiver_pet_id": receiver_pet_id,
        "status": "pending",
        "created_at": now
    }
    await db.friendships.insert_one(friendship)
    
    return {"status": "pending", "friendship_id": friendship["friendship_id"]}
