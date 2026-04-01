from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

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

api_router.include_router(auth_router)
api_router.include_router(pets_router)
api_router.include_router(breeder_router)
api_router.include_router(feed_router)
api_router.include_router(admin_router)
api_router.include_router(ai_router)
api_router.include_router(search_router)
api_router.include_router(certificates_router)

app.include_router(api_router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": "Petbookin"}


# Seed admin on startup
@app.on_event("startup")
async def seed_admin():
    from utils.auth import hash_password, generate_user_id
    from datetime import datetime, timezone

    admin = await db.users.find_one({"is_admin": True}, {"_id": 0})
    if not admin:
        admin_id = generate_user_id()
        now = datetime.now(timezone.utc)
        await db.users.insert_one({
            "user_id": admin_id,
            "email": "admin@petbookin.com",
            "password_hash": hash_password("PetbookinAdmin2026!"),
            "name": "Petbookin Admin",
            "picture": "",
            "bio": "Official Petbookin Administrator",
            "account_type": "admin",
            "membership_tier": "mega",
            "membership_status": "active",
            "membership_expires_at": None,
            "role": "owner",
            "role_title": "Site Owner",
            "role_badge": "owner",
            "is_admin": True,
            "breeder_info": None,
            "ai_generations_used": 0,
            "points": 0,
            "profile_theme": {
                "bg_color": "#FFFDF9",
                "card_bg": "#FFFFFF",
                "text_color": "#28211E",
                "accent_color": "#FF7A6A",
                "music_url": None,
                "video_bg_url": None,
                "avatar_border": "default"
            },
            "created_at": now,
            "updated_at": now
        })
        logger.info(f"Admin seeded: admin@petbookin.com")
