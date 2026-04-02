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

VIP_PASS_PRICE = 4.99

CANCELLATION_FEES = {
    "prime": {"name": "Prime Cancellation Fee", "amount": 1.99},
    "pro": {"name": "Pro Cancellation Fee", "amount": 4.99},
    "ultra": {"name": "Ultra Cancellation Fee", "amount": 9.99},
    "mega": {"name": "Mega Cancellation Fee", "amount": 14.99},
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
    db = request.app.state.db
    user = await get_current_user(request, db)

    body = await request.json()
    pack_id = body.get("pack_id")
    origin_url = body.get("origin_url")

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


# ─── VIP Pass Purchase ───
@router.post("/purchase-vip-pass")
async def purchase_vip_pass(request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)

    if user.get("membership_tier", "free") != "free":
        raise HTTPException(status_code=400, detail="You already have a subscription with VIP access")

    existing_pass = await db.vip_passes.find_one(
        {"user_id": user["user_id"], "status": "active"}, {"_id": 0}
    )
    if existing_pass:
        from datetime import datetime as dt_mod
        if dt_mod.now(timezone.utc) < dt_mod.fromisoformat(str(existing_pass["expires_at"])):
            raise HTTPException(status_code=400, detail="You already have an active VIP pass")

    body = await request.json()
    origin_url = body.get("origin_url", "")

    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{origin_url}/vip-directory?session_id={{CHECKOUT_SESSION_ID}}&type=vip_pass"
    cancel_url = f"{origin_url}/vip-directory"

    metadata = {
        "user_id": user["user_id"],
        "user_email": user["email"],
        "purchase_type": "vip_pass",
        "pass_duration_days": "7",
    }

    checkout_req = CheckoutSessionRequest(
        amount=float(VIP_PASS_PRICE),
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
        "purchase_type": "vip_pass",
        "amount": VIP_PASS_PRICE,
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": now,
        "updated_at": now,
    })

    return {"url": session.url, "session_id": session.session_id}


# ─── Free Trial Activation ───
@router.post("/start-trial")
async def start_free_trial(request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)

    if user.get("membership_tier", "free") != "free":
        raise HTTPException(status_code=400, detail="You already have an active subscription")

    existing_trial = await db.trials.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if existing_trial:
        raise HTTPException(status_code=400, detail="You've already used your free trial")

    body = await request.json()
    tier_id = body.get("tier_id", "prime")
    if tier_id not in TIER_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid tier for trial")

    now = datetime.now(timezone.utc)
    from datetime import timedelta
    trial_end = now + timedelta(days=7)

    await db.trials.insert_one({
        "user_id": user["user_id"],
        "user_email": user["email"],
        "tier_id": tier_id,
        "trial_start": now,
        "trial_end": trial_end,
        "status": "active",
        "created_at": now,
    })

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "membership_tier": tier_id,
            "membership_status": "trial",
            "trial_ends_at": trial_end.isoformat(),
            "updated_at": now,
        }}
    )

    logger.info(f"User {user['user_id']} started 7-day trial for {tier_id}")
    return {
        "message": f"7-day {TIER_PACKAGES[tier_id]['name']} trial activated!",
        "tier": tier_id,
        "trial_end": trial_end.isoformat(),
    }


# ─── Subscription Cancellation ───
@router.post("/cancel-subscription")
async def cancel_subscription(request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)

    current_tier = user.get("membership_tier", "free")
    if current_tier == "free":
        raise HTTPException(status_code=400, detail="No active subscription to cancel")

    body = await request.json()
    origin_url = body.get("origin_url", "")

    fee_info = CANCELLATION_FEES.get(current_tier)
    if not fee_info:
        raise HTTPException(status_code=400, detail="Cannot determine cancellation fee")

    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{origin_url}/membership?session_id={{CHECKOUT_SESSION_ID}}&type=cancellation"
    cancel_url = f"{origin_url}/membership"

    metadata = {
        "user_id": user["user_id"],
        "user_email": user["email"],
        "purchase_type": "cancellation",
        "cancelled_tier": current_tier,
    }

    checkout_req = CheckoutSessionRequest(
        amount=float(fee_info["amount"]),
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
        "purchase_type": "cancellation",
        "cancelled_tier": current_tier,
        "cancellation_fee": fee_info["amount"],
        "amount": fee_info["amount"],
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": now,
        "updated_at": now,
    })

    return {"url": session.url, "session_id": session.session_id, "fee": fee_info["amount"], "fee_name": fee_info["name"]}


@router.get("/cancellation-fee")
async def get_cancellation_fee(request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)
    tier = user.get("membership_tier", "free")
    fee_info = CANCELLATION_FEES.get(tier)
    return {"tier": tier, "fee": fee_info["amount"] if fee_info else 0, "fee_name": fee_info["name"] if fee_info else ""}


@router.get("/trial-status")
async def get_trial_status(request: Request):
    from utils.auth import get_current_user
    db = request.app.state.db
    user = await get_current_user(request, db)
    trial = await db.trials.find_one({"user_id": user["user_id"]}, {"_id": 0})
    has_used_trial = trial is not None
    is_on_trial = user.get("membership_status") == "trial"
    trial_end = user.get("trial_ends_at")
    return {
        "has_used_trial": has_used_trial,
        "is_on_trial": is_on_trial,
        "trial_end": trial_end,
        "current_tier": user.get("membership_tier", "free"),
    }
