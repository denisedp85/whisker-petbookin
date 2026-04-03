from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# App
app = FastAPI(title="Petbookin API")
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store db in app state for route access
app.state.db = db

# Import and include route modules
from routes.auth import router as auth_router
from routes.pets import router as pets_router
from routes.breeder import router as breeder_router
from routes.feed import router as feed_router
from routes.admin import router as admin_router
from routes.ai import router as ai_router
from routes.search import router as search_router
from routes.certificates import router as certificates_router
from routes.places import router as places_router
from routes.stripe import router as stripe_router
from routes.webhook import router as webhook_router
from routes.chat import router as chat_router
from routes.marketplace import router as marketplace_router
from routes.marketplace_payments import router as marketplace_payments_router
from routes.games import router as games_router
from routes.uploads import router as uploads_router
from routes.notifications import router as notifications_router
from routes.live import router as live_router
from routes.tournaments import router as tournaments_router
from routes.users import router as users_router
from routes.friends import router as friends_router

api_router.include_router(auth_router)
api_router.include_router(pets_router)
api_router.include_router(breeder_router)
api_router.include_router(feed_router)
api_router.include_router(admin_router)
api_router.include_router(ai_router)
api_router.include_router(search_router)
api_router.include_router(certificates_router)
api_router.include_router(places_router)
api_router.include_router(stripe_router)
api_router.include_router(webhook_router)
api_router.include_router(chat_router)
api_router.include_router(marketplace_router)
api_router.include_router(marketplace_payments_router)
api_router.include_router(games_router)
api_router.include_router(uploads_router)
api_router.include_router(notifications_router)
api_router.include_router(live_router)
api_router.include_router(tournaments_router)
api_router.include_router(users_router)
api_router.include_router(friends_router)

app.include_router(api_router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": "Petbookin"}


@app.get("/health")
async def health_check_root():
    return {"status": "healthy", "app": "Petbookin"}


# ─── WebSocket Signaling for Live Streams ───
from routes.live import active_streams

@app.websocket("/api/ws/live/{stream_id}")
async def live_stream_ws(websocket: WebSocket, stream_id: str):
    await websocket.accept()
    token = websocket.query_params.get("token", "")
    role = websocket.query_params.get("role", "viewer")

    # Authenticate user from token
    user_session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not user_session:
        await websocket.close(code=4001)
        return
    user = await db.users.find_one({"user_id": user_session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        await websocket.close(code=4001)
        return

    user_id = user["user_id"]
    user_name = user.get("name", "User")

    # Ensure stream room exists
    if stream_id not in active_streams:
        active_streams[stream_id] = {"broadcaster": None, "viewers": {}, "chat": []}

    room = active_streams[stream_id]

    try:
        if role == "broadcaster":
            room["broadcaster"] = websocket
            logger.info(f"WS: Broadcaster {user_id} connected to {stream_id}")
        else:
            room["viewers"][user_id] = websocket
            # Update viewer count in DB
            await db.live_streams.update_one(
                {"stream_id": stream_id},
                {"$inc": {"viewer_count": 1}}
            )
            # Update peak
            stream = await db.live_streams.find_one({"stream_id": stream_id}, {"_id": 0})
            if stream and stream.get("viewer_count", 0) > stream.get("peak_viewers", 0):
                await db.live_streams.update_one(
                    {"stream_id": stream_id},
                    {"$set": {"peak_viewers": stream["viewer_count"]}}
                )

            # Notify broadcaster
            if room["broadcaster"]:
                await room["broadcaster"].send_text(json.dumps({
                    "type": "viewer_joined",
                    "viewer_id": user_id,
                    "viewer_name": user_name,
                    "viewer_count": len(room["viewers"]),
                }))
            logger.info(f"WS: Viewer {user_id} joined {stream_id}")

        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type in ("offer", "answer", "ice_candidate"):
                target_id = msg.get("target")
                target_ws = None
                if target_id == "broadcaster" and room["broadcaster"]:
                    target_ws = room["broadcaster"]
                elif target_id in room["viewers"]:
                    target_ws = room["viewers"][target_id]
                if target_ws:
                    msg["sender"] = user_id
                    await target_ws.send_text(json.dumps(msg))

            elif msg_type == "chat":
                chat_msg = {
                    "sender_id": user_id,
                    "sender_name": user_name,
                    "message": msg.get("message", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat() if True else "",
                }
                room["chat"].append(chat_msg)
                broadcast_msg = json.dumps({"type": "chat", **chat_msg})
                # Send to all participants
                if room["broadcaster"]:
                    try:
                        await room["broadcaster"].send_text(broadcast_msg)
                    except Exception:
                        pass
                for vid, vws in room["viewers"].items():
                    try:
                        await vws.send_text(broadcast_msg)
                    except Exception:
                        pass

            elif msg_type == "request_offers":
                # Viewer requesting peer connections from broadcaster
                if room["broadcaster"]:
                    await room["broadcaster"].send_text(json.dumps({
                        "type": "create_offer",
                        "target": user_id,
                        "viewer_name": user_name,
                    }))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WS error in {stream_id}: {e}")
    finally:
        if role == "broadcaster":
            room["broadcaster"] = None
            # Notify all viewers
            end_msg = json.dumps({"type": "stream_ended"})
            for vws in room["viewers"].values():
                try:
                    await vws.send_text(end_msg)
                except Exception:
                    pass
        else:
            room["viewers"].pop(user_id, None)
            await db.live_streams.update_one(
                {"stream_id": stream_id, "viewer_count": {"$gt": 0}},
                {"$inc": {"viewer_count": -1}}
            )
            if room["broadcaster"]:
                try:
                    await room["broadcaster"].send_text(json.dumps({
                        "type": "viewer_left",
                        "viewer_id": user_id,
                        "viewer_count": len(room["viewers"]),
                    }))
                except Exception:
                    pass
        logger.info(f"WS: {role} {user_id} disconnected from {stream_id}")


# Seed admin and init storage on startup
@app.on_event("startup")
async def seed_admin():
    # Init object storage
    try:
        from routes.uploads import init_storage
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")

    # Clear stale places cache on startup for fresh map data
    try:
        from datetime import datetime, timezone
        result = await db.places_cache.delete_many({"expires_at": {"$lt": datetime.now(timezone.utc)}})
        if result.deleted_count:
            logger.info(f"Cleared {result.deleted_count} stale places cache entries")
    except Exception as e:
        logger.warning(f"Places cache cleanup: {e}")

    from utils.auth import hash_password, generate_user_id
    from datetime import datetime, timezone

    admin_fields = {
        "is_admin": True,
        "role": "owner",
        "role_title": "Site Owner",
        "role_badge": "owner",
        "account_type": "admin",
        "membership_tier": "mega",
        "membership_status": "active",
        "membership_expires_at": None,
        "is_seller": True,
    }

    # Upgrade admin@petbookin.com
    existing = await db.users.find_one({"email": "admin@petbookin.com"}, {"_id": 0})
    if existing:
        await db.users.update_one(
            {"email": "admin@petbookin.com"},
            {"$set": {**admin_fields, "updated_at": datetime.now(timezone.utc)}}
        )
        logger.info("Admin user admin@petbookin.com upgraded to owner/mega")
    else:
        admin_id = generate_user_id()
        now = datetime.now(timezone.utc)
        await db.users.insert_one({
            "user_id": admin_id,
            "email": "admin@petbookin.com",
            "password_hash": hash_password("PetbookinAdmin2026!"),
            "name": "Petbookin Admin",
            "picture": "",
            "bio": "Official Petbookin Administrator",
            **admin_fields,
            "breeder_info": None,
            "ai_generations_used": 0,
            "points": 0,
            "profile_theme": {
                "bg_color": "#FFFDF9", "card_bg": "#FFFFFF",
                "text_color": "#28211E", "accent_color": "#FF7A6A",
                "music_url": None, "video_bg_url": None, "avatar_border": "default"
            },
            "created_at": now, "updated_at": now
        })
        logger.info("Admin seeded: admin@petbookin.com")

    # Delete dedape1985@gmail.com if it exists (account permanently removed)
    dedape = await db.users.find_one({"email": "dedape1985@gmail.com"}, {"_id": 0})
    if dedape:
        user_id = dedape.get("user_id")
        await db.users.delete_one({"email": "dedape1985@gmail.com"})
        if user_id:
            await db.pets.delete_many({"owner_id": user_id})
            await db.posts.delete_many({"author_id": user_id})
            await db.notifications.delete_many({"$or": [{"user_id": user_id}, {"from_user_id": user_id}]})
            await db.conversations.delete_many({"participants": user_id})
            await db.messages.delete_many({"sender_id": user_id})
            await db.blocked_users.delete_many({"$or": [{"blocker_id": user_id}, {"blocked_id": user_id}]})
            await db.reports.delete_many({"reporter_id": user_id})
        logger.info("Account dedape1985@gmail.com permanently deleted")
