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
        tier_id = metadata.get("tier_id")

        if not user_id or not tier_id:
            logger.warning(f"Webhook missing metadata: user_id={user_id}, tier_id={tier_id}")
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
