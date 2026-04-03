from fastapi import APIRouter, Request
from emergentintegrations.payments.stripe.checkout import StripeCheckout
from datetime import datetime, timezone
import os
import uuid
import logging

router = APIRouter(tags=["webhook"])
logger = logging.getLogger(__name__)


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    db = request.app.state.db
    api_key = os.environ["STRIPE_API_KEY"]

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
            elif pack_type == "live_time":
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$inc": {"live_bonus_minutes": pack_qty}, "$set": {"updated_at": now}},
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

        elif purchase_type == "tip":
            stream_id = metadata.get("stream_id", "")
            broadcaster_id = metadata.get("broadcaster_id", "")
            tip_points = int(metadata.get("tip_points_equivalent", "0"))
            tip_usd = float(metadata.get("tip_amount_usd", "0"))

            # Credit broadcaster with points equivalent
            if broadcaster_id and tip_points > 0:
                await db.users.update_one(
                    {"user_id": broadcaster_id},
                    {"$inc": {"points": tip_points, "tips_received_total": tip_points}, "$set": {"updated_at": now}}
                )

            # Log tip
            tipper_name = metadata.get("user_email", "Anonymous")
            if stream_id:
                await db.live_streams.update_one(
                    {"stream_id": stream_id},
                    {"$inc": {"tips_total": tip_points}, "$push": {"tips": {
                        "tipper_id": user_id,
                        "tipper_name": tipper_name,
                        "amount": tip_points,
                        "amount_usd": tip_usd,
                        "type": "card",
                        "timestamp": now.isoformat(),
                    }}}
                )

            await db.tips.insert_one({
                "stream_id": stream_id,
                "tipper_id": user_id,
                "tipper_name": tipper_name,
                "broadcaster_id": broadcaster_id,
                "amount": tip_points,
                "amount_usd": tip_usd,
                "type": "card",
                "created_at": now,
            })
            logger.info(f"Webhook: Tip ${tip_usd} ({tip_points}pts) from {user_id} to {broadcaster_id}")

        elif purchase_type == "marketplace":
            listing_id = metadata.get("listing_id", "")
            buyer_id = metadata.get("buyer_id", "")
            seller_id = metadata.get("seller_id", "")

            # Mark listing as sold
            if listing_id:
                await db.marketplace_listings.update_one(
                    {"listing_id": listing_id},
                    {"$set": {"status": "sold", "sold_to": buyer_id, "sold_at": now}}
                )

            # Credit seller balance
            txn_data = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            listing_title = txn_data.get("listing_title", "Item") if txn_data else "Item"
            amount = txn_data.get("amount", 0) if txn_data else 0
            seller_earnings = txn_data.get("seller_earnings", 0) if txn_data else 0

            if seller_id and seller_earnings > 0:
                await db.users.update_one(
                    {"user_id": seller_id},
                    {"$inc": {
                        "seller_earnings": seller_earnings,
                        "seller_balance": seller_earnings,
                    }, "$set": {"updated_at": now}}
                )

            # Notify seller
            if seller_id:
                await db.notifications.insert_one({
                    "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                    "user_id": seller_id,
                    "type": "marketplace_sale",
                    "title": "Item Sold!",
                    "message": f'Your listing "{listing_title}" sold for ${amount:.2f}! You earned ${seller_earnings:.2f}.',
                    "read": False,
                    "created_at": now,
                })

            logger.info(f"Webhook: Marketplace sale listing={listing_id} buyer={buyer_id} seller={seller_id}")

        elif metadata.get("type") == "coin_purchase":
            coins = int(metadata.get("coins", "0"))
            if coins > 0:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$inc": {"coins": coins}, "$set": {"updated_at": now}}
                )
                await db.coin_purchases.update_one(
                    {"stripe_session_id": session_id},
                    {"$set": {"status": "completed", "completed_at": now}}
                )
                logger.info(f"Webhook: User {user_id} purchased {coins} coins")

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
