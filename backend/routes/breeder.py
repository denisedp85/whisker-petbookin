from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from models.schemas import BreederRegister, ExternalCredential, PetbookinCredentialRequest
from utils.auth import get_current_user, generate_breeder_id
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/breeder", tags=["Breeder"])


def get_db(request: Request):
    return request.app.state.db


@router.post("/register")
async def register_as_breeder(data: BreederRegister, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)

    if user.get("breeder_info"):
        raise HTTPException(status_code=400, detail="Already registered as breeder")

    breeder_id = generate_breeder_id()
    now = datetime.now(timezone.utc)

    breeder_info = {
        "petbookin_breeder_id": breeder_id,
        "kennel_name": data.kennel_name,
        "specializations": data.specializations,
        "years_experience": data.years_experience,
        "external_credentials": [],
        "petbookin_credential": None,
        "is_verified": False,
        "breeder_points": 0,
        "registered_at": now
    }

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "breeder_info": breeder_info,
            "account_type": "breeder",
            "updated_at": now
        }}
    )

    return {"message": "Registered as breeder", "breeder_id": breeder_id, "breeder_info": breeder_info}


@router.post("/credential/external")
async def add_external_credential(data: ExternalCredential, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)

    if not user.get("breeder_info"):
        raise HTTPException(status_code=400, detail="Register as breeder first")

    cred = {
        "registry": data.registry.upper(),
        "registry_id": data.registry_id,
        "breed_registered": data.breed_registered,
        "verified": False,
        "added_at": datetime.now(timezone.utc).isoformat()
    }

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$push": {"breeder_info.external_credentials": cred}}
    )

    return {"message": f"{data.registry} credential added", "credential": cred}


@router.post("/credential/petbookin")
async def request_petbookin_credential(data: PetbookinCredentialRequest, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)

    if not user.get("breeder_info"):
        raise HTTPException(status_code=400, detail="Register as breeder first")

    if user["breeder_info"].get("petbookin_credential"):
        raise HTTPException(status_code=400, detail="Already have Petbookin credential")

    petbookin_cred = {
        "credential_id": f"PBK-CRED-{user['breeder_info']['petbookin_breeder_id'].split('-')[-1]}",
        "status": "active",
        "reason": data.reason,
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "benefits": ["VIP Events", "Tournaments", "Group Gatherings", "Verified Badge"]
    }

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "breeder_info.petbookin_credential": petbookin_cred,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return {"message": "Petbookin credential issued", "credential": petbookin_cred}


@router.post("/verify")
async def verify_breeder(request: Request):
    """Auto-verify breeder if they have subscription + credentials"""
    db = get_db(request)
    user = await get_current_user(request, db)

    if not user.get("breeder_info"):
        raise HTTPException(status_code=400, detail="Not a breeder")

    has_subscription = user.get("membership_tier", "free") != "free"
    has_credentials = (
        len(user["breeder_info"].get("external_credentials", [])) > 0
        or user["breeder_info"].get("petbookin_credential") is not None
    )

    if has_subscription and has_credentials:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "breeder_info.is_verified": True,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        # Also mark all their pets as verified breeder pets
        await db.pets.update_many(
            {"owner_id": user["user_id"]},
            {"$set": {"verified_breeder": True}}
        )
        return {"message": "Breeder verified!", "is_verified": True}

    reasons = []
    if not has_subscription:
        reasons.append("Active subscription required")
    if not has_credentials:
        reasons.append("At least one credential (external or Petbookin) required")
    return {"message": "Not yet eligible", "is_verified": False, "reasons": reasons}


@router.get("/profile/{user_id}")
async def get_breeder_profile(user_id: str, request: Request):
    db = get_db(request)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user or not user.get("breeder_info"):
        raise HTTPException(status_code=404, detail="Breeder not found")

    pets = await db.pets.find({"owner_id": user_id}, {"_id": 0}).to_list(50)

    return {
        "user_id": user["user_id"],
        "name": user["name"],
        "picture": user.get("picture", ""),
        "membership_tier": user.get("membership_tier", "free"),
        "breeder_info": user["breeder_info"],
        "profile_theme": user.get("profile_theme", {}),
        "pets": pets
    }


@router.get("/directory")
async def breeder_directory(request: Request, page: int = 1, limit: int = 20):
    db = get_db(request)
    skip = (page - 1) * limit
    breeders = await db.users.find(
        {"breeder_info": {"$ne": None}},
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)

    total = await db.users.count_documents({"breeder_info": {"$ne": None}})

    return {
        "breeders": breeders,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/vip-directory")
async def vip_breeder_directory(request: Request, search: str = "", species: str = "", page: int = 1, limit: int = 20):
    """VIP directory - browsable by all, contact info gated behind subscription or VIP pass."""
    db = get_db(request)
    user = await get_current_user(request, db)

    # Build query
    query = {"breeder_info": {"$ne": None}}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"breeder_info.kennel_name": {"$regex": search, "$options": "i"}},
            {"breeder_info.specializations": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    breeders = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)

    total = await db.users.count_documents(query)

    # Filter by species if provided
    if species:
        breeders = [
            b for b in breeders
            if any(species.lower() in s.lower() for s in b.get("breeder_info", {}).get("specializations", []))
        ]

    # Check VIP access
    has_vip_access = False
    vip_expiry = None
    is_paid = user.get("membership_tier", "free") != "free"

    if not is_paid:
        vip_pass = await db.vip_passes.find_one(
            {"user_id": user["user_id"], "status": "active"},
            {"_id": 0}
        )
        if vip_pass:
            if datetime.now(timezone.utc) < datetime.fromisoformat(str(vip_pass["expires_at"])):
                has_vip_access = True
                vip_expiry = str(vip_pass["expires_at"])
            else:
                await db.vip_passes.update_one(
                    {"user_id": user["user_id"], "status": "active"},
                    {"$set": {"status": "expired"}}
                )

    # If no access, strip contact info from breeders
    can_view = is_paid or has_vip_access
    if not can_view:
        for b in breeders:
            b.pop("email", None)
            b.pop("phone", None)

    return {
        "breeders": breeders,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "has_vip_access": has_vip_access,
        "vip_expiry": vip_expiry,
    }
