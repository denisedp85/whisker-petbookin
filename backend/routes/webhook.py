from fastapi import APIRouter, Request
from emergentintegrations.payments.stripe.checkout import StripeCheckout
from datetime import datetime, timezone
import os
import logging

router = APIRouter(tags=["webhook"])
logger = logging.getLogger(__name__)


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    db = request.app.state.db
    api_key = os.environ["STRIPE_API_KEY"]
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")

    try:
        webhook_response = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Webhook verification failed: {e}")
        return {"status": "error", "message": str(e)}

    logger.info(f"Webhook event: type={webhook_response.event_type}, session={webhook_response.session_id}, payment={webhook_response.payment_status}")

    now = datetime.now(timezone.utc)

    if webhook_response.event_type == "checkout.session.completed" and webhook_response.payment_status == "paid":
        session_id = webhook_response.session_id
        metadata = webhook_response.metadata or {}
        user_id = metadata.get("user_id")

        if not user_id:
            logger.warning("Webhook missing user_id in metadata")
            return {"status": "ok"}

        txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if txn and txn.get("payment_status") == "paid":
            logger.info(f"Duplicate webhook for session {session_id}, skipping")
            return {"status": "ok"}

        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "completed", "updated_at": now}},
            upsert=True,
        )

        purchase_type = metadata.get("purchase_type", "subscription")

        if purchase_type == "ala_carte":
            pack_type = metadata.get("pack_type")
            pack_qty = int(metadata.get("pack_quantity", "0"))
            if pack_type == "ai_gens":
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$inc": {"ai_generations_bonus": pack_qty}, "$set": {"updated_at": now}},
                )
            elif pack_type == "promotion":
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$inc": {"promotions_available": pack_qty}, "$set": {"updated_at": now}},
                )
            logger.info(f"Webhook: User {user_id} purchased {pack_type} x{pack_qty}")

        elif purchase_type == "vip_pass":
            from datetime import timedelta
            duration = int(metadata.get("pass_duration_days", "7"))
            expires_at = now + timedelta(days=duration)
            await db.vip_passes.update_one(
                {"user_id": user_id, "status": "active"},
                {"$set": {"status": "replaced"}},
            )
            await db.vip_passes.insert_one({
                "user_id": user_id,
                "purchased_at": now,
                "expires_at": expires_at,
                "status": "active",
                "duration_days": duration,
            })
            logger.info(f"Webhook: User {user_id} purchased {duration}-day VIP pass")

        elif purchase_type == "cancellation":
            cancelled_tier = metadata.get("cancelled_tier", "")
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "membership_tier": "free",
                    "membership_status": "cancelled",
                    "cancelled_tier": cancelled_tier,
                    "cancelled_at": now,
                    "updated_at": now,
                }},
            )
            logger.info(f"Webhook: User {user_id} cancelled {cancelled_tier} subscription")

        else:
            tier_id = metadata.get("tier_id")
            if tier_id:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "membership_tier": tier_id,
                        "membership_status": "active",
                        "updated_at": now,
                    }},
                )
                logger.info(f"Webhook: User {user_id} upgraded to {tier_id}")

    return {"status": "ok"}
