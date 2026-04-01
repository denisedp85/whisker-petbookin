from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse
)
import os
import logging

router = APIRouter(prefix="/stripe", tags=["stripe"])
logger = logging.getLogger(__name__)

TIER_PACKAGES = {
    "prime": {"name": "Prime", "amount": 4.99, "interval": "week"},
    "pro": {"name": "Pro", "amount": 14.99, "interval": "month"},
    "ultra": {"name": "Ultra", "amount": 24.99, "interval": "month"},
    "mega": {"name": "Mega", "amount": 39.99, "interval": "month"},
}

ALA_CARTE_PACKS = {
    "ai_10": {"name": "10 AI Generations", "amount": 2.99, "type": "ai_gens", "quantity": 10},
    "ai_50": {"name": "50 AI Generations", "amount": 9.99, "type": "ai_gens", "quantity": 50},
    "promo_1": {"name": "Post Promotion (1 Week)", "amount": 4.99, "type": "promotion", "quantity": 1},
}


class CheckoutRequest(BaseModel):
    tier_id: str
    origin_url: str


@router.post("/create-checkout-session")
async def create_checkout_session(req: CheckoutRequest, request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)

    if req.tier_id not in TIER_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid tier")

    package = TIER_PACKAGES[req.tier_id]
    api_key = os.environ["STRIPE_API_KEY"]

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{req.origin_url}/membership?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/membership"

    metadata = {
        "user_id": user["user_id"],
        "user_email": user["email"],
        "tier_id": req.tier_id,
        "tier_name": package["name"],
    }

    checkout_req = CheckoutSessionRequest(
        amount=float(package["amount"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)

    now = datetime.now(timezone.utc)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "user_email": user["email"],
        "tier_id": req.tier_id,
        "tier_name": package["name"],
        "amount": package["amount"],
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": now,
        "updated_at": now,
    })

    logger.info(f"Checkout session created: {session.session_id} for user {user['user_id']} tier {req.tier_id}")
    return {"url": session.url, "session_id": session.session_id}


@router.get("/checkout-status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)

    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

    txn = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    now = datetime.now(timezone.utc)

    if status.payment_status == "paid" and txn["payment_status"] != "paid":
        tier_id = txn["tier_id"]
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "completed", "updated_at": now}},
        )
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "membership_tier": tier_id,
                "membership_status": "active",
                "updated_at": now,
            }},
        )
        logger.info(f"User {user['user_id']} upgraded to {tier_id} via checkout {session_id}")
    elif status.payment_status != "paid" and txn["status"] != "completed":
        new_status = "expired" if status.status == "expired" else txn["status"]
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": new_status, "updated_at": now}},
        )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "tier_id": txn["tier_id"],
        "tier_name": txn["tier_name"],
    }


@router.get("/publishable-key")
async def get_publishable_key():
    key = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
    return {"publishable_key": key}



@router.get("/payment-history")
async def payment_history(request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)

    txns = await db.payment_transactions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return {"transactions": txns}


@router.post("/purchase-pack")
async def purchase_pack(request: Request):
    from utils.auth import get_current_user
    import json as json_mod
    body = await request.json()
    pack_id = body.get("pack_id")
    origin_url = body.get("origin_url")

    db = request.app.state.db
    user = await get_current_user(request, db)

    if pack_id not in ALA_CARTE_PACKS:
        raise HTTPException(status_code=400, detail="Invalid pack")

    pack = ALA_CARTE_PACKS[pack_id]
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{origin_url}/membership?session_id={{CHECKOUT_SESSION_ID}}&type=pack"
    cancel_url = f"{origin_url}/membership"

    metadata = {
        "user_id": user["user_id"],
        "user_email": user["email"],
        "pack_id": pack_id,
        "pack_type": pack["type"],
        "pack_quantity": str(pack["quantity"]),
        "purchase_type": "ala_carte",
    }

    checkout_req = CheckoutSessionRequest(
        amount=float(pack["amount"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    session = await stripe_checkout.create_checkout_session(checkout_req)

    now = datetime.now(timezone.utc)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "user_email": user["email"],
        "purchase_type": "ala_carte",
        "pack_id": pack_id,
        "pack_name": pack["name"],
        "amount": pack["amount"],
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": now,
        "updated_at": now,
    })

    return {"url": session.url, "session_id": session.session_id}


@router.get("/pack-checkout-status/{session_id}")
async def pack_checkout_status(session_id: str, request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)

    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

    txn = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    now = datetime.now(timezone.utc)

    if status.payment_status == "paid" and txn["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "completed", "updated_at": now}},
        )
        pack_type = txn.get("metadata", {}).get("pack_type")
        pack_qty = int(txn.get("metadata", {}).get("pack_quantity", "0"))

        if pack_type == "ai_gens":
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {"ai_generations_bonus": pack_qty}, "$set": {"updated_at": now}},
            )
        elif pack_type == "promotion":
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {"promotions_available": pack_qty}, "$set": {"updated_at": now}},
            )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "pack_name": txn.get("pack_name", ""),
    }
