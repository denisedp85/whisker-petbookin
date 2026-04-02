from fastapi import APIRouter, Request, HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone, timedelta
from utils.auth import get_current_user
import uuid
import json
import logging
import asyncio

router = APIRouter(prefix="/live", tags=["Live"])
logger = logging.getLogger(__name__)

# Time limits per tier (minutes)
LIVE_TIME_LIMITS = {
    "free": 5,
    "prime": 15,
    "pro": 30,
    "ultra": 60,
    "mega": 480,
}

# Unlock thresholds
LIKES_THRESHOLD = 50
POINTS_THRESHOLD = 100

# Points exchange rates
LIVE_TIME_POINTS = {
    15: 50,
    30: 100,
    60: 180,
}

# A la carte packs
LIVE_TIME_PACKS = {
    "live_30": {"name": "30 Min Live Pass", "amount": 1.99, "minutes": 30},
    "live_60": {"name": "60 Min Live Pass", "amount": 3.99, "minutes": 60},
}

# Active WebSocket connections per stream
active_streams: dict[str, dict] = {}
# {stream_id: {"broadcaster": ws, "viewers": {user_id: ws}, "chat": []}}


def get_db(request):
    return request.app.state.db


@router.get("/eligibility")
async def check_eligibility(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    tier = user.get("membership_tier", "free")
    points = user.get("points", 0)

    # Count total likes received on user's posts
    pipeline = [
        {"$match": {"author_id": user["user_id"]}},
        {"$group": {"_id": None, "total_likes": {"$sum": {"$size": {"$ifNull": ["$likes", []]}}}}}
    ]
    result = await db.posts.aggregate(pipeline).to_list(1)
    total_likes = result[0]["total_likes"] if result else 0

    is_subscriber = tier != "free"
    meets_likes = total_likes >= LIKES_THRESHOLD
    meets_points = points >= POINTS_THRESHOLD
    is_eligible = is_subscriber or (meets_likes and meets_points)

    # Check bonus minutes
    bonus_mins = user.get("live_bonus_minutes", 0)
    base_limit = LIVE_TIME_LIMITS.get(tier, 5)

    return {
        "eligible": is_eligible,
        "total_likes": total_likes,
        "likes_threshold": LIKES_THRESHOLD,
        "points": points,
        "points_threshold": POINTS_THRESHOLD,
        "is_subscriber": is_subscriber,
        "tier": tier,
        "base_minutes": base_limit,
        "bonus_minutes": bonus_mins,
        "total_minutes": base_limit + bonus_mins,
        "points_packs": [
            {"minutes": mins, "points_cost": cost} for mins, cost in LIVE_TIME_POINTS.items()
        ],
        "card_packs": [
            {"pack_id": k, **v} for k, v in LIVE_TIME_PACKS.items()
        ],
    }


@router.post("/start")
async def start_stream(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    tier = user.get("membership_tier", "free")
    points = user.get("points", 0)

    # Check eligibility
    pipeline = [
        {"$match": {"author_id": user["user_id"]}},
        {"$group": {"_id": None, "total_likes": {"$sum": {"$size": {"$ifNull": ["$likes", []]}}}}}
    ]
    result = await db.posts.aggregate(pipeline).to_list(1)
    total_likes = result[0]["total_likes"] if result else 0

    is_subscriber = tier != "free"
    if not is_subscriber and not (total_likes >= LIKES_THRESHOLD and points >= POINTS_THRESHOLD):
        raise HTTPException(status_code=403, detail=f"Need {LIKES_THRESHOLD} likes and {POINTS_THRESHOLD} points to go live. You have {total_likes} likes and {points} points.")

    # Check no active stream
    existing = await db.live_streams.find_one(
        {"broadcaster_id": user["user_id"], "status": "live"}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active stream")

    body = await request.json()
    title = body.get("title", "Live Stream")
    description = body.get("description", "")
    category = body.get("category", "feed")

    base_limit = LIVE_TIME_LIMITS.get(tier, 5)
    bonus_mins = user.get("live_bonus_minutes", 0)
    max_duration = base_limit + bonus_mins

    stream_id = f"live_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    stream_doc = {
        "stream_id": stream_id,
        "broadcaster_id": user["user_id"],
        "broadcaster_name": user.get("name", "Unknown"),
        "broadcaster_picture": user.get("picture", ""),
        "broadcaster_tier": tier,
        "title": title,
        "description": description,
        "category": category,
        "status": "live",
        "started_at": now,
        "ended_at": None,
        "max_duration_mins": max_duration,
        "viewer_count": 0,
        "peak_viewers": 0,
        "recording_url": None,
        "likes": [],
        "likes_count": 0,
        "created_at": now,
    }
    await db.live_streams.insert_one(stream_doc)

    # Reset bonus minutes after use
    if bonus_mins > 0:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"live_bonus_minutes": 0, "updated_at": now}}
        )

    # Init active stream room
    active_streams[stream_id] = {"broadcaster": None, "viewers": {}, "chat": []}

    logger.info(f"Stream {stream_id} started by {user['user_id']} ({title}) - {max_duration}min limit")

    stream_doc.pop("_id", None)
    return stream_doc


@router.post("/end/{stream_id}")
async def end_stream(stream_id: str, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)

    stream = await db.live_streams.find_one({"stream_id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if stream["broadcaster_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only broadcaster can end stream")
    if stream["status"] != "live":
        raise HTTPException(status_code=400, detail="Stream already ended")

    now = datetime.now(timezone.utc)
    body = await request.json()
    recording_url = body.get("recording_url")

    await db.live_streams.update_one(
        {"stream_id": stream_id},
        {"$set": {
            "status": "ended",
            "ended_at": now,
            "recording_url": recording_url,
        }}
    )

    # Notify viewers via WebSocket
    room = active_streams.pop(stream_id, None)
    if room:
        msg = json.dumps({"type": "stream_ended"})
        for ws in room.get("viewers", {}).values():
            try:
                await ws.send_text(msg)
            except Exception:
                pass

    logger.info(f"Stream {stream_id} ended. Recording: {recording_url}")
    return {"message": "Stream ended", "stream_id": stream_id, "recording_url": recording_url}


@router.post("/like/{stream_id}")
async def like_stream(stream_id: str, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)

    stream = await db.live_streams.find_one({"stream_id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    likes = stream.get("likes", [])
    if user["user_id"] in likes:
        await db.live_streams.update_one(
            {"stream_id": stream_id},
            {"$pull": {"likes": user["user_id"]}, "$inc": {"likes_count": -1}}
        )
        return {"liked": False}
    else:
        await db.live_streams.update_one(
            {"stream_id": stream_id},
            {"$push": {"likes": user["user_id"]}, "$inc": {"likes_count": 1}}
        )
        return {"liked": True}


@router.get("/active")
async def get_active_streams(request: Request, category: str = ""):
    db = get_db(request)
    query = {"status": "live"}
    if category:
        query["category"] = category
    streams = await db.live_streams.find(query, {"_id": 0}).sort("started_at", -1).to_list(50)
    return {"streams": streams}


@router.get("/recordings")
async def get_recordings(request: Request, category: str = "", limit: int = 20):
    db = get_db(request)
    query = {"status": "ended", "recording_url": {"$ne": None}}
    if category:
        query["category"] = category
    recordings = await db.live_streams.find(query, {"_id": 0}).sort("ended_at", -1).limit(limit).to_list(limit)
    return {"recordings": recordings}


@router.get("/stream/{stream_id}")
async def get_stream(stream_id: str, request: Request):
    db = get_db(request)
    stream = await db.live_streams.find_one({"stream_id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    return stream


@router.post("/purchase-time-points")
async def purchase_time_with_points(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)

    body = await request.json()
    minutes = body.get("minutes", 15)

    cost = LIVE_TIME_POINTS.get(minutes)
    if cost is None:
        raise HTTPException(status_code=400, detail="Invalid time pack. Choose 15, 30, or 60 minutes.")

    if user.get("points", 0) < cost:
        raise HTTPException(status_code=400, detail=f"Not enough points. Need {cost}, have {user.get('points', 0)}.")

    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {"points": -cost, "live_bonus_minutes": minutes},
            "$set": {"updated_at": now}
        }
    )

    await db.live_time_purchases.insert_one({
        "user_id": user["user_id"],
        "purchase_type": "points",
        "minutes_purchased": minutes,
        "points_spent": cost,
        "created_at": now,
    })

    logger.info(f"User {user['user_id']} bought {minutes}min live time for {cost} points")
    return {
        "message": f"Purchased {minutes} minutes of live time for {cost} points",
        "minutes": minutes,
        "points_spent": cost,
        "points_remaining": user.get("points", 0) - cost,
    }


@router.get("/my-streams")
async def get_my_streams(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    streams = await db.live_streams.find(
        {"broadcaster_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return {"streams": streams}
