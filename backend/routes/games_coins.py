from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone, timedelta
from utils.auth import get_current_user
import uuid
import logging
import os

router = APIRouter(prefix="/games", tags=["Games Coins"])
logger = logging.getLogger(__name__)

LIVES_MAX = 5
LIVES_REGEN_MINUTES = 30
COIN_PACKAGES = [
    {"package_id": "coins_100", "coins": 100, "price": 99, "label": "100 Coins", "stripe_amount": 99},
    {"package_id": "coins_500", "coins": 500, "price": 399, "label": "500 Coins", "stripe_amount": 399},
    {"package_id": "coins_1500", "coins": 1500, "price": 999, "label": "1,500 Coins", "stripe_amount": 999},
]
LIFE_COST_COINS = 20  # cost to buy 1 extra life


@router.get("/lives")
async def get_lives(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    uid = user["user_id"]

    lives_data = await db.game_lives.find_one({"user_id": uid}, {"_id": 0})
    if not lives_data:
        lives_data = {
            "user_id": uid,
            "lives": LIVES_MAX,
            "last_regen": datetime.now(timezone.utc).isoformat(),
            "max_lives": LIVES_MAX,
        }
        await db.game_lives.insert_one(lives_data)

    # Calculate regenerated lives
    now = datetime.now(timezone.utc)
    last_regen = datetime.fromisoformat(lives_data["last_regen"]) if isinstance(lives_data["last_regen"], str) else lives_data["last_regen"]
    if last_regen.tzinfo is None:
        last_regen = last_regen.replace(tzinfo=timezone.utc)
    elapsed = (now - last_regen).total_seconds() / 60
    regen_count = int(elapsed // LIVES_REGEN_MINUTES)

    current_lives = min(lives_data["lives"] + regen_count, LIVES_MAX)

    if regen_count > 0:
        new_regen_time = last_regen + timedelta(minutes=regen_count * LIVES_REGEN_MINUTES)
        await db.game_lives.update_one(
            {"user_id": uid},
            {"$set": {"lives": current_lives, "last_regen": new_regen_time.isoformat()}}
        )

    # Next regen time
    minutes_until = max(0, LIVES_REGEN_MINUTES - int(elapsed % LIVES_REGEN_MINUTES)) if current_lives < LIVES_MAX else 0

    return {
        "lives": current_lives,
        "max_lives": LIVES_MAX,
        "minutes_until_next": minutes_until,
        "coins": user.get("coins", 0),
    }


@router.post("/use-life")
async def use_life(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    uid = user["user_id"]

    lives_data = await db.game_lives.find_one({"user_id": uid}, {"_id": 0})
    if not lives_data:
        lives_data = {"user_id": uid, "lives": LIVES_MAX, "last_regen": datetime.now(timezone.utc).isoformat(), "max_lives": LIVES_MAX}
        await db.game_lives.insert_one(lives_data)

    # Recalculate with regen
    now = datetime.now(timezone.utc)
    last_regen = datetime.fromisoformat(lives_data["last_regen"]) if isinstance(lives_data["last_regen"], str) else lives_data["last_regen"]
    if last_regen.tzinfo is None:
        last_regen = last_regen.replace(tzinfo=timezone.utc)
    elapsed = (now - last_regen).total_seconds() / 60
    regen_count = int(elapsed // LIVES_REGEN_MINUTES)
    current_lives = min(lives_data["lives"] + regen_count, LIVES_MAX)

    if current_lives <= 0:
        raise HTTPException(status_code=400, detail="No lives remaining! Buy more with coins or wait for regeneration.")

    new_lives = current_lives - 1
    await db.game_lives.update_one(
        {"user_id": uid},
        {"$set": {"lives": new_lives, "last_regen": now.isoformat()}},
        upsert=True
    )

    return {"lives": new_lives, "max_lives": LIVES_MAX}


@router.post("/buy-life")
async def buy_life_with_coins(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    uid = user["user_id"]

    coins = user.get("coins", 0)
    if coins < LIFE_COST_COINS:
        raise HTTPException(status_code=400, detail=f"Not enough coins. Need {LIFE_COST_COINS}, have {coins}.")

    await db.users.update_one({"user_id": uid}, {"$inc": {"coins": -LIFE_COST_COINS}})
    await db.game_lives.update_one(
        {"user_id": uid},
        {"$inc": {"lives": 1}},
        upsert=True
    )

    updated = await db.game_lives.find_one({"user_id": uid}, {"_id": 0})
    return {"lives": updated["lives"], "coins": coins - LIFE_COST_COINS, "cost": LIFE_COST_COINS}


@router.get("/coin-packages")
async def get_coin_packages(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    return {"packages": COIN_PACKAGES, "coins": user.get("coins", 0)}


@router.post("/buy-coins/{package_id}")
async def buy_coins(package_id: str, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    pkg = next((p for p in COIN_PACKAGES if p["package_id"] == package_id), None)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    try:
        from emergentintegrations.llm.providers.stripe import StripeCheckout, CheckoutRequest
        api_key = os.environ["STRIPE_API_KEY"]
        host_url = str(request.base_url).rstrip("/")
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}/api/webhook/stripe")

        checkout_req = CheckoutRequest(
            product_name=f"Petbookin {pkg['label']}",
            unit_amount=pkg["stripe_amount"],
            quantity=1,
            mode="payment",
            success_url=f"{host_url}/games?coins_purchased={pkg['coins']}&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{host_url}/games",
            metadata={"user_id": user["user_id"], "type": "coin_purchase", "coins": str(pkg["coins"])},
        )
        result = await stripe_checkout.create_checkout_session(checkout_req)

        await db.coin_purchases.insert_one({
            "purchase_id": f"cp_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "package_id": package_id,
            "coins": pkg["coins"],
            "amount": pkg["stripe_amount"],
            "stripe_session_id": result.session_id,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        })

        return {"checkout_url": result.checkout_url, "session_id": result.session_id}
    except Exception as e:
        logger.error(f"Coin purchase checkout failed: {e}")
        raise HTTPException(status_code=500, detail="Checkout failed")


@router.get("/weekly-awards")
async def get_weekly_awards(request: Request):
    db = request.app.state.db
    await get_current_user(request, db)

    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    # Get this week's top scorers
    pipeline = [
        {"$match": {"created_at": {"$gte": week_start}, "status": "completed"}},
        {"$group": {"_id": "$user_id", "total_points": {"$sum": "$points_earned"}, "games_played": {"$sum": 1}}},
        {"$sort": {"total_points": -1}},
        {"$limit": 10},
    ]
    weekly_scores = await db.game_sessions.aggregate(pipeline).to_list(10)

    # Enrich with user data
    winners = []
    for ws in weekly_scores:
        u = await db.users.find_one({"user_id": ws["_id"]}, {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "membership_tier": 1})
        if u:
            winners.append({**u, "weekly_points": ws["total_points"], "games_played": ws["games_played"]})

    # Previous winners
    prev_awards = await db.weekly_awards.find(
        {}, {"_id": 0}
    ).sort("week_ending", -1).limit(4).to_list(4)

    return {
        "current_week": winners,
        "week_start": week_start.isoformat(),
        "week_end": (week_start + timedelta(days=6, hours=23, minutes=59)).isoformat(),
        "previous_awards": prev_awards,
    }


@router.post("/memory/submit")
async def submit_memory_game(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    body = await request.json()

    moves = max(int(body.get("moves", 999)), 1)
    time_taken = max(int(body.get("time", 999)), 1)
    pairs = int(body.get("pairs", 6))
    points = max(1, min(20, 25 - (moves // 3) - (time_taken // 20)))

    now = datetime.now(timezone.utc)
    await db.game_sessions.insert_one({
        "session_id": f"mem_{uuid.uuid4().hex[:12]}",
        "game_id": "pet_memory",
        "user_id": user["user_id"],
        "score": pairs - (moves - pairs),
        "points_earned": points,
        "status": "completed",
        "created_at": now,
    })
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": points}})
    return {"moves": moves, "time": time_taken, "points_earned": points}


@router.post("/word-scramble/submit")
async def submit_word_scramble(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    body = await request.json()

    correct = int(body.get("correct", 0))
    total = int(body.get("total", 5))
    points = max(1, min(20, correct * 4))

    now = datetime.now(timezone.utc)
    await db.game_sessions.insert_one({
        "session_id": f"ws_{uuid.uuid4().hex[:12]}",
        "game_id": "word_scramble",
        "user_id": user["user_id"],
        "score": correct,
        "points_earned": points,
        "status": "completed",
        "created_at": now,
    })
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": points}})
    return {"correct": correct, "total": total, "points_earned": points}


@router.post("/paw-match/submit")
async def submit_paw_match(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    body = await request.json()

    score = min(int(body.get("score", 0)), 500)
    level = int(body.get("level", 1))
    points = max(1, min(25, score // 20))

    now = datetime.now(timezone.utc)
    await db.game_sessions.insert_one({
        "session_id": f"pm_{uuid.uuid4().hex[:12]}",
        "game_id": "paw_match",
        "user_id": user["user_id"],
        "score": score,
        "points_earned": points,
        "status": "completed",
        "created_at": now,
    })
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": points}})
    return {"score": score, "level": level, "points_earned": points}
