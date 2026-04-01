from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from utils.auth import get_current_user
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/certificates", tags=["Certificates"])

CERT_FEES = {
    "individual": 12.99,
    "litter": 29.99,
    "transfer": 9.99,
}

FREE_CERT_TIERS = ["mega"]
DISCOUNT_TIERS = {"ultra": 0.5, "pro": 0.75}


def get_db(request: Request):
    return request.app.state.db


def generate_cert_id():
    year = datetime.now(timezone.utc).year
    seq = uuid.uuid4().hex[:6].upper()
    return f"PBK-CERT-{year}-{seq}"


def generate_litter_id():
    year = datetime.now(timezone.utc).year
    seq = uuid.uuid4().hex[:6].upper()
    return f"PBK-LTR-{year}-{seq}"


@router.post("/register-pet")
async def register_pet_certificate(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    body = await request.json()

    if not user.get("breeder_info"):
        raise HTTPException(status_code=403, detail="Only registered breeders can issue certificates")

    pet_id = body.get("pet_id")
    pet = None
    if pet_id:
        pet = await db.pets.find_one({"pet_id": pet_id, "owner_id": user["user_id"]}, {"_id": 0})

    existing = await db.certificates.find_one({"pet_id": pet_id, "status": "active"}, {"_id": 0}) if pet_id else None
    if existing:
        raise HTTPException(status_code=400, detail="This pet already has an active certificate")

    now = datetime.now(timezone.utc)
    cert_id = generate_cert_id()

    cert_doc = {
        "certificate_id": cert_id,
        "type": "individual",
        "pet_id": pet_id,
        "owner_id": user["user_id"],
        "breeder_id": user["user_id"],
        "pet_info": {
            "name": body.get("pet_name", pet["name"] if pet else ""),
            "breed": body.get("breed", pet.get("breed", "") if pet else ""),
            "species": body.get("species", pet.get("species", "") if pet else ""),
            "dob": body.get("dob", ""),
            "gender": body.get("gender", pet.get("gender", "") if pet else ""),
            "color_markings": body.get("color_markings", ""),
            "microchip_id": body.get("microchip_id", ""),
        },
        "pedigree": {
            "sire": {
                "name": body.get("sire_name", ""),
                "breed": body.get("sire_breed", ""),
                "certificate_id": body.get("sire_cert_id", ""),
            },
            "dam": {
                "name": body.get("dam_name", ""),
                "breed": body.get("dam_breed", ""),
                "certificate_id": body.get("dam_cert_id", ""),
            },
        },
        "litter_id": body.get("litter_id"),
        "kennel_name": user["breeder_info"].get("kennel_name", ""),
        "breeder_pbk_id": user["breeder_info"].get("petbookin_breeder_id", ""),
        "status": "active",
        "fee_paid": _calc_fee(user, "individual"),
        "issued_at": now,
        "transfer_history": [],
    }

    await db.certificates.insert_one(cert_doc)
    return await db.certificates.find_one({"certificate_id": cert_id}, {"_id": 0})


@router.post("/register-litter")
async def register_litter(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    body = await request.json()

    if not user.get("breeder_info"):
        raise HTTPException(status_code=403, detail="Only registered breeders can register litters")

    now = datetime.now(timezone.utc)
    litter_id = generate_litter_id()

    litter_doc = {
        "litter_id": litter_id,
        "breeder_id": user["user_id"],
        "breeder_name": user["name"],
        "kennel_name": user["breeder_info"].get("kennel_name", ""),
        "breeder_pbk_id": user["breeder_info"].get("petbookin_breeder_id", ""),
        "breed": body.get("breed", ""),
        "species": body.get("species", "dog"),
        "sire": {
            "name": body.get("sire_name", ""),
            "breed": body.get("sire_breed", ""),
            "certificate_id": body.get("sire_cert_id", ""),
        },
        "dam": {
            "name": body.get("dam_name", ""),
            "breed": body.get("dam_breed", ""),
            "certificate_id": body.get("dam_cert_id", ""),
        },
        "whelp_date": body.get("whelp_date", ""),
        "puppy_count": body.get("puppy_count", 0),
        "puppies": body.get("puppies", []),
        "status": "active",
        "fee_paid": _calc_fee(user, "litter"),
        "registered_at": now,
    }

    await db.litters.insert_one(litter_doc)
    return await db.litters.find_one({"litter_id": litter_id}, {"_id": 0})


@router.post("/transfer")
async def transfer_certificate(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    body = await request.json()

    cert_id = body.get("certificate_id")
    new_owner_email = body.get("new_owner_email")

    cert = await db.certificates.find_one({"certificate_id": cert_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if cert["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="You don't own this certificate")
    if cert["status"] != "active":
        raise HTTPException(status_code=400, detail="Certificate is not active")

    new_owner = await db.users.find_one({"email": new_owner_email.lower()}, {"_id": 0})
    if not new_owner:
        raise HTTPException(status_code=404, detail="New owner not found. They must have a Petbookin account.")

    now = datetime.now(timezone.utc)
    transfer_record = {
        "from_user_id": user["user_id"],
        "from_name": user["name"],
        "to_user_id": new_owner["user_id"],
        "to_name": new_owner["name"],
        "transferred_at": now.isoformat(),
    }

    await db.certificates.update_one(
        {"certificate_id": cert_id},
        {
            "$set": {"owner_id": new_owner["user_id"]},
            "$push": {"transfer_history": transfer_record},
        }
    )

    if cert.get("pet_id"):
        await db.pets.update_one(
            {"pet_id": cert["pet_id"]},
            {"$set": {"owner_id": new_owner["user_id"]}}
        )

    return {"message": f"Certificate transferred to {new_owner['name']}", "transfer": transfer_record}


@router.get("/mine")
async def my_certificates(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    certs = await db.certificates.find(
        {"owner_id": user["user_id"]}, {"_id": 0}
    ).sort("issued_at", -1).to_list(100)
    return certs


@router.get("/issued")
async def issued_certificates(request: Request):
    """Certificates issued by this breeder"""
    db = get_db(request)
    user = await get_current_user(request, db)
    certs = await db.certificates.find(
        {"breeder_id": user["user_id"]}, {"_id": 0}
    ).sort("issued_at", -1).to_list(100)
    return certs


@router.get("/litters")
async def my_litters(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    litters = await db.litters.find(
        {"breeder_id": user["user_id"]}, {"_id": 0}
    ).sort("registered_at", -1).to_list(50)
    return litters


@router.get("/verify/{cert_id}")
async def verify_certificate(cert_id: str, request: Request):
    """Public verification endpoint"""
    db = get_db(request)
    cert = await db.certificates.find_one({"certificate_id": cert_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    owner = await db.users.find_one({"user_id": cert["owner_id"]}, {"_id": 0, "password_hash": 0})
    breeder = await db.users.find_one({"user_id": cert["breeder_id"]}, {"_id": 0, "password_hash": 0})

    return {
        "certificate": cert,
        "owner": {"name": owner["name"], "user_id": owner["user_id"]} if owner else None,
        "breeder": {
            "name": breeder["name"],
            "user_id": breeder["user_id"],
            "breeder_info": breeder.get("breeder_info"),
        } if breeder else None,
        "is_valid": cert["status"] == "active",
    }


@router.get("/fees")
async def get_fees(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    tier = user.get("membership_tier", "free")

    fees = {}
    for cert_type, base_fee in CERT_FEES.items():
        if tier in FREE_CERT_TIERS:
            fees[cert_type] = 0
        elif tier in DISCOUNT_TIERS:
            fees[cert_type] = round(base_fee * DISCOUNT_TIERS[tier], 2)
        else:
            fees[cert_type] = base_fee

    return {"fees": fees, "tier": tier, "base_fees": CERT_FEES}


def _calc_fee(user, cert_type):
    tier = user.get("membership_tier", "free")
    base = CERT_FEES.get(cert_type, 0)
    if tier in FREE_CERT_TIERS:
        return 0
    if tier in DISCOUNT_TIERS:
        return round(base * DISCOUNT_TIERS[tier], 2)
    return base
