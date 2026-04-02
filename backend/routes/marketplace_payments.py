from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from utils.auth import get_current_user
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutStatusResponse
)
import os
import uuid
import logging

router = APIRouter(prefix="/marketplace", tags=["Marketplace Payments"])
logger = logging.getLogger(__name__)

PLATFORM_FEE_PERCENT = 10  # Platform keeps 10%, seller gets 90%


def get_checkout(request):
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


# ─── Seller Setup (Mark as payment-ready) ───

@router.post("/connect/setup")
async def setup_seller(request: Request):
    """Mark user as a verified seller who can receive payments."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "is_seller": True,
            "seller_since": now,
            "seller_earnings": user.get("seller_earnings", 0),
            "seller_balance": user.get("seller_balance", 0),
            "updated_at": now,
        }}
    )

    return {"status": "active", "message": "You're now set up as a seller!"}


@router.get("/connect/status")
async def connect_status(request: Request):
    """Check if the user is set up as a seller."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    is_seller = user.get("is_seller", False)
    return {
        "connected": is_seller,
        "status": "active" if is_seller else "not_started",
        "seller_since": user.get("seller_since", ""),
    }


# ─── Marketplace Buy Now ───

@router.post("/buy/{listing_id}")
async def buy_listing(listing_id: str, request: Request):
    """Create a Stripe Checkout Session to purchase a marketplace listing."""
    db = request.app.state.db
    user = await get_current_user(request, db)
    stripe_checkout = get_checkout(request)

    body = await request.json()
    origin_url = body.get("origin_url", "")

    # Get listing
    listing = await db.marketplace_listings.find_one(
        {"listing_id": listing_id, "status": "active"}, {"_id": 0}
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or no longer available")

    if listing["seller_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot buy your own listing")

    # Calculate fees
    price = listing["price"]
    platform_fee = round(price * PLATFORM_FEE_PERCENT / 100, 2)
    seller_earnings = round(price - platform_fee, 2)

    success_url = f"{origin_url}/marketplace?purchase=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/marketplace?purchase=cancelled"

    metadata = {
        "listing_id": listing_id,
        "buyer_id": user["user_id"],
        "buyer_email": user.get("email", ""),
        "seller_id": listing["seller_id"],
        "seller_name": listing.get("seller_name", ""),
        "listing_title": listing["title"],
        "purchase_type": "marketplace",
        "platform_fee": str(platform_fee),
        "seller_earnings": str(seller_earnings),
    }

    checkout_req = CheckoutSessionRequest(
        amount=float(price),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    session = await stripe_checkout.create_checkout_session(checkout_req)

    # Record transaction
    now = datetime.now(timezone.utc)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "user_email": user.get("email", ""),
        "seller_id": listing["seller_id"],
        "listing_id": listing_id,
        "listing_title": listing["title"],
        "purchase_type": "marketplace",
        "amount": price,
        "platform_fee": platform_fee,
        "seller_earnings": seller_earnings,
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": now,
        "updated_at": now,
    })

    logger.info(f"Marketplace checkout: buyer={user['user_id']} listing={listing_id} amount=${price} fee=${platform_fee}")
    return {"url": session.url, "session_id": session.session_id}


@router.get("/buy/status/{session_id}")
async def marketplace_purchase_status(session_id: str, request: Request):
    """Poll marketplace purchase status."""
    db = request.app.state.db
    user = await get_current_user(request, db)
    stripe_checkout = get_checkout(request)

    txn = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["user_id"], "purchase_type": "marketplace"},
        {"_id": 0}
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    now = datetime.now(timezone.utc)
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

    if status.payment_status == "paid" and txn["payment_status"] != "paid":
        # Mark transaction as paid
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "completed", "updated_at": now}}
        )

        # Mark listing as sold
        await db.marketplace_listings.update_one(
            {"listing_id": txn["listing_id"]},
            {"$set": {"status": "sold", "sold_to": user["user_id"], "sold_at": now}}
        )

        # Credit seller's balance
        await db.users.update_one(
            {"user_id": txn["seller_id"]},
            {"$inc": {
                "seller_earnings": txn["seller_earnings"],
                "seller_balance": txn["seller_earnings"],
            }, "$set": {"updated_at": now}}
        )

        # Notify seller
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": txn["seller_id"],
            "type": "marketplace_sale",
            "title": "Item Sold!",
            "message": f'Your listing "{txn["listing_title"]}" sold for ${txn["amount"]:.2f}! You earned ${txn["seller_earnings"]:.2f}.',
            "read": False,
            "created_at": now,
        })

        # Notify buyer
        await db.notifications.insert_one({
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "type": "marketplace_purchase",
            "title": "Purchase Complete!",
            "message": f'You purchased "{txn["listing_title"]}" for ${txn["amount"]:.2f}. Contact the seller for delivery details.',
            "read": False,
            "created_at": now,
        })

        logger.info(f"Marketplace sale complete: listing={txn['listing_id']} buyer={user['user_id']} seller={txn['seller_id']}")

        return {
            "status": "completed",
            "payment_status": "paid",
            "listing_title": txn["listing_title"],
            "amount": txn["amount"],
        }
    elif status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "expired", "status": "expired", "updated_at": now}}
        )
        return {"status": "expired", "payment_status": "expired"}

    return {
        "status": txn["status"],
        "payment_status": txn["payment_status"],
        "listing_title": txn["listing_title"],
        "amount": txn["amount"],
    }


# ─── Seller Sales & Dashboard ───

@router.get("/connect/sales")
async def seller_sales(request: Request):
    """Get the seller's marketplace sales."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    sales = await db.payment_transactions.find(
        {"seller_id": user["user_id"], "purchase_type": "marketplace", "payment_status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    total_earnings = sum(s.get("seller_earnings", 0) for s in sales)
    total_platform_fees = sum(s.get("platform_fee", 0) for s in sales)
    balance = user.get("seller_balance", 0)

    return {
        "sales": sales,
        "total_sales": len(sales),
        "total_earnings": round(total_earnings, 2),
        "total_platform_fees": round(total_platform_fees, 2),
        "current_balance": round(balance, 2),
        "platform_fee_percent": PLATFORM_FEE_PERCENT,
    }


# ─── Buyer Purchases ───

@router.get("/purchases")
async def buyer_purchases(request: Request):
    """Get the buyer's marketplace purchases."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    purchases = await db.payment_transactions.find(
        {"user_id": user["user_id"], "purchase_type": "marketplace", "payment_status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    return {"purchases": purchases}


# ─── Admin: View All Marketplace Transactions ───

@router.get("/admin/transactions")
async def admin_marketplace_transactions(request: Request):
    """Admin view of all marketplace transactions."""
    db = request.app.state.db
    user = await get_current_user(request, db)

    if not user.get("is_admin") and user.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Admin only")

    txns = await db.payment_transactions.find(
        {"purchase_type": "marketplace"},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)

    total_revenue = sum(t.get("platform_fee", 0) for t in txns if t.get("payment_status") == "paid")
    total_volume = sum(t.get("amount", 0) for t in txns if t.get("payment_status") == "paid")

    return {
        "transactions": txns,
        "total_revenue": round(total_revenue, 2),
        "total_volume": round(total_volume, 2),
        "platform_fee_percent": PLATFORM_FEE_PERCENT,
    }
