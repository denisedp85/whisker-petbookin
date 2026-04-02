from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from utils.auth import get_current_user
import uuid
import logging

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])
logger = logging.getLogger(__name__)


def gen_listing_id():
    return f"lst_{uuid.uuid4().hex[:12]}"


class CreateListing(BaseModel):
    title: str
    description: str
    price: float
    category: str  # pets, accessories, services, food
    species: Optional[str] = None
    breed: Optional[str] = None
    condition: str = "new"  # new, used, excellent
    location: Optional[str] = None
    image_url: Optional[str] = None


class ListingInquiry(BaseModel):
    message: str


@router.get("/listings")
async def get_listings(request: Request, category: str = "", search: str = "", sort: str = "newest"):
    db = request.app.state.db
    await get_current_user(request, db)

    query = {"status": "active"}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    sort_order = [("is_featured", -1)]
    if sort == "newest":
        sort_order.append(("created_at", -1))
    elif sort == "price_low":
        sort_order.append(("price", 1))
    elif sort == "price_high":
        sort_order.append(("price", -1))

    listings = await db.marketplace_listings.find(query, {"_id": 0}).sort(sort_order).limit(50).to_list(50)
    return {"listings": listings}


@router.post("/listings")
async def create_listing(data: CreateListing, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    now = datetime.now(timezone.utc)
    listing = {
        "listing_id": gen_listing_id(),
        "seller_id": user["user_id"],
        "seller_name": user["name"],
        "seller_picture": user.get("picture", ""),
        "seller_tier": user.get("membership_tier", "free"),
        "title": data.title,
        "description": data.description,
        "price": data.price,
        "category": data.category,
        "species": data.species,
        "breed": data.breed,
        "condition": data.condition,
        "location": data.location or "",
        "image_url": data.image_url or "",
        "status": "active",
        "is_featured": False,
        "views": 0,
        "inquiries_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.marketplace_listings.insert_one(listing)
    del listing["_id"]
    return listing


@router.get("/listings/{listing_id}")
async def get_listing(listing_id: str, request: Request):
    db = request.app.state.db
    await get_current_user(request, db)

    listing = await db.marketplace_listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    await db.marketplace_listings.update_one(
        {"listing_id": listing_id}, {"$inc": {"views": 1}}
    )

    seller = await db.users.find_one(
        {"user_id": listing["seller_id"]},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "membership_tier": 1, "breeder_info": 1}
    )

    return {**listing, "seller": seller}


@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    listing = await db.marketplace_listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["seller_id"] != user["user_id"] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.marketplace_listings.delete_one({"listing_id": listing_id})
    return {"message": "Listing deleted"}


@router.post("/listings/{listing_id}/inquire")
async def send_inquiry(listing_id: str, data: ListingInquiry, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    listing = await db.marketplace_listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    now = datetime.now(timezone.utc)
    inquiry = {
        "inquiry_id": f"inq_{uuid.uuid4().hex[:12]}",
        "listing_id": listing_id,
        "listing_title": listing["title"],
        "from_user_id": user["user_id"],
        "from_user_name": user["name"],
        "to_user_id": listing["seller_id"],
        "message": data.message,
        "created_at": now,
    }
    await db.marketplace_inquiries.insert_one(inquiry)
    await db.marketplace_listings.update_one(
        {"listing_id": listing_id}, {"$inc": {"inquiries_count": 1}}
    )
    return {"message": "Inquiry sent"}


@router.get("/my-listings")
async def my_listings(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    listings = await db.marketplace_listings.find(
        {"seller_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"listings": listings}
