from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Response, Request, Query, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = os.environ.get('APP_NAME', 'petbookin')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# Membership Plans (defined server-side for security)
MEMBERSHIP_PLANS = {
    "prime_weekly": {"name": "PRIME Weekly", "amount": 4.99, "tier": "prime", "period": "week"},
    "pro_monthly": {"name": "PRO Monthly", "amount": 14.99, "tier": "pro", "period": "month"},
    "ultra_monthly": {"name": "ULTRA Monthly", "amount": 24.99, "tier": "ultra", "period": "month"},
    "mega_monthly": {"name": "MEGA Monthly", "amount": 39.99, "tier": "mega", "period": "month"},
    "pro_yearly": {"name": "PRO Yearly", "amount": 305.88, "tier": "pro", "period": "year"},
    "promote_listing": {"name": "Promoted Listing (1 week)", "amount": 3.49, "tier": "none", "period": "week"},
    "donation_5": {"name": "Donation $5", "amount": 5.00, "tier": "none", "period": "once"},
    "donation_10": {"name": "Donation $10", "amount": 10.00, "tier": "none", "period": "once"},
    "donation_25": {"name": "Donation $25", "amount": 25.00, "tier": "none", "period": "once"},
    "donation_custom": {"name": "Custom Donation", "amount": 0, "tier": "none", "period": "once"},
}

# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Create the main app
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===== MODELS =====

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    date_of_birth: Optional[str] = ""
    sex: Optional[str] = ""
    phone: Optional[str] = ""
    backup_phone: Optional[str] = ""
    backup_email: Optional[str] = ""
    account_type: str = "pet_owner"  # pet_owner or breeder
    owner_bio: Optional[str] = ""
    owner_hobbies: Optional[str] = ""
    owner_interests: Optional[str] = ""
    website: Optional[str] = ""
    kennel_club: Optional[str] = ""
    kennel_registration: Optional[str] = ""

class UserLogin(BaseModel):
    email: str
    password: str

class PetCreate(BaseModel):
    name: str
    species: str = "Dog"
    breed: str = ""
    age: Optional[str] = ""
    bio: Optional[str] = ""
    weight: Optional[str] = ""
    personality_traits: Optional[List[str]] = []
    favorite_activities: Optional[List[str]] = []
    medical_info: Optional[str] = ""
    is_breeder_profile: bool = False

class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    age: Optional[str] = None
    bio: Optional[str] = None
    weight: Optional[str] = None
    personality_traits: Optional[List[str]] = None
    favorite_activities: Optional[List[str]] = None
    medical_info: Optional[str] = None

class PostCreate(BaseModel):
    content: str
    pet_id: str
    image_path: Optional[str] = None

class CommentCreate(BaseModel):
    content: str
    pet_id: str

class AIBioRequest(BaseModel):
    pet_name: str
    species: str
    breed: str
    personality_traits: List[str] = []
    favorite_activities: List[str] = []

# Breeder Registry Models
class BreederEventCreate(BaseModel):
    title: str
    description: str
    event_type: str  # tournament, show, competition, workshop
    date: str
    location: str
    species_allowed: List[str] = []
    entry_fee: float = 0.0
    prizes: str = ""

class BreederEventRegistration(BaseModel):
    event_id: str
    pet_id: str

class BreederAward(BaseModel):
    event_id: str
    pet_id: str
    award_title: str
    award_type: str  # gold, silver, bronze, participant, winner
    points: int = 0

# ===== AUTH HELPERS =====

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(request: Request, authorization: str = Header(None)):
    token = None
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    # Check Authorization header
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Try JWT first
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user:
            return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        pass
    # Try as session token
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at > datetime.now(timezone.utc):
            user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
            if user:
                return user
    raise HTTPException(status_code=401, detail="Not authenticated")

# ===== AUTH ROUTES =====

@api_router.post("/auth/register")
@limiter.limit("5/minute")
async def register(request: Request, data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Check phone uniqueness if provided
    if data.phone:
        existing_phone = await db.users.find_one({"phone": data.phone}, {"_id": 0})
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    # Generate email verification code
    verification_code = str(uuid.uuid4().hex[:6]).upper()
    # Generate Petbookin breeder credentials for unregistered breeders
    petbookin_breeder_id = ""
    if data.account_type == "breeder" and not data.kennel_club:
        petbookin_breeder_id = f"PBK-BR-{uuid.uuid4().hex[:8].upper()}"
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "password": hashed,
        "name": data.name,
        "date_of_birth": data.date_of_birth,
        "sex": data.sex,
        "phone": data.phone,
        "backup_phone": data.backup_phone,
        "backup_email": data.backup_email,
        "account_type": data.account_type,
        "picture": "",
        "owner_bio": data.owner_bio,
        "owner_hobbies": data.owner_hobbies,
        "owner_interests": data.owner_interests,
        "website": data.website,
        "kennel_club": data.kennel_club,
        "kennel_registration": data.kennel_registration,
        "petbookin_breeder_id": petbookin_breeder_id,
        "email_verified": False,
        "verification_code": verification_code,
        "membership_tier": "free",
        "membership_status": "none",
        "stripe_customer_id": "",
        "auth_type": "jwt",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_jwt_token(user_id)
    user_doc.pop("password", None)
    user_doc.pop("_id", None)
    user_doc.pop("verification_code", None)
    return {"token": token, "user": {k: v for k, v in user_doc.items() if k != "_id"}, "verification_code_sent": True}

@api_router.post("/auth/verify-email")
async def verify_email(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    code = body.get("code", "").upper()
    stored = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not stored:
        raise HTTPException(status_code=404, detail="User not found")
    if stored.get("email_verified"):
        return {"message": "Email already verified"}
    if stored.get("verification_code") == code:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"email_verified": True}})
        return {"message": "Email verified successfully"}
    raise HTTPException(status_code=400, detail="Invalid verification code")

@api_router.get("/auth/verification-code")
async def get_verification_code(user=Depends(get_current_user)):
    """Returns code for display (in production this would be sent via email)"""
    stored = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if stored.get("email_verified"):
        return {"verified": True, "code": None}
    return {"verified": False, "code": stored.get("verification_code", "")}

@api_router.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("password"):
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    if not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support for assistance.")
    # Use "id" field (not "user_id")
    user_id = user.get("user_id") or user.get("id")
    token = create_jwt_token(user_id)
    safe_user = {k: v for k, v in user.items() if k not in ("password", "_id")}
    return {"token": token, "user": safe_user}

@api_router.post("/auth/google-session")
async def google_session(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    resp = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": session_id}, timeout=10
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    google_data = resp.json()
    email = google_data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {
            "name": google_data.get("name", existing.get("name", "")),
            "picture": google_data.get("picture", existing.get("picture", "")),
        }})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": google_data.get("name", ""),
            "picture": google_data.get("picture", ""),
            "owner_bio": "",
            "owner_hobbies": "",
            "owner_interests": "",
            "kennel_club": "",
            "kennel_registration": "",
            "auth_type": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    session_token = google_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    safe_user = {k: v for k, v in user.items() if k not in ("password", "_id")}
    response = JSONResponse(content={"user": safe_user, "token": session_token})
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/",
        max_age=7*24*60*60
    )
    return response

@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    safe_user = {k: v for k, v in user.items() if k not in ("password", "_id")}
    return safe_user

@api_router.post("/auth/logout")
async def logout(request: Request):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token", path="/")
    return response

@api_router.put("/auth/profile")
async def update_profile(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    allowed = ["name", "owner_bio", "owner_hobbies", "owner_interests", "kennel_club", "kennel_registration"]
    updates = {k: v for k, v in body.items() if k in allowed}
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {k: v for k, v in updated.items() if k not in ("password", "_id")}

# ===== PET ROUTES =====

@api_router.post("/pets")
async def create_pet(data: PetCreate, user=Depends(get_current_user)):
    pet_id = f"pet_{uuid.uuid4().hex[:12]}"
    
    # If creating a breeder profile and owner doesn't have Petbookin Breeder ID, assign one
    if data.is_breeder_profile and not user.get("petbookin_breeder_id"):
        petbookin_breeder_id = f"PBK-BR-{uuid.uuid4().hex[:8].upper()}"
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"petbookin_breeder_id": petbookin_breeder_id}}
        )
        logger.info(f"Assigned Petbookin Breeder ID {petbookin_breeder_id} to user {user['user_id']}")
    
    pet_doc = {
        "pet_id": pet_id,
        "owner_id": user["user_id"],
        "name": data.name,
        "species": data.species,
        "breed": data.breed,
        "age": data.age,
        "bio": data.bio,
        "weight": data.weight,
        "personality_traits": data.personality_traits or [],
        "favorite_activities": data.favorite_activities or [],
        "medical_info": data.medical_info,
        "is_breeder_profile": data.is_breeder_profile,
        "profile_photo": "",
        "cover_photo": "",
        "friends_count": 0,
        "posts_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pets.insert_one(pet_doc)
    pet_doc.pop("_id", None)
    return pet_doc

@api_router.get("/pets/mine")
async def get_my_pets(user=Depends(get_current_user)):
    pets = await db.pets.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return pets

@api_router.get("/pets/{pet_id}")
async def get_pet(pet_id: str):
    pet = await db.pets.find_one({"pet_id": pet_id}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    owner = await db.users.find_one({"user_id": pet["owner_id"]}, {"_id": 0})
    if owner:
        pet["owner"] = {k: v for k, v in owner.items() if k not in ("password", "_id")}
    return pet

@api_router.put("/pets/{pet_id}")
async def update_pet(pet_id: str, data: PetUpdate, user=Depends(get_current_user)):
    pet = await db.pets.find_one({"pet_id": pet_id}, {"_id": 0})
    if not pet or pet["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if updates:
        await db.pets.update_one({"pet_id": pet_id}, {"$set": updates})
    updated = await db.pets.find_one({"pet_id": pet_id}, {"_id": 0})
    return updated

@api_router.get("/pets")
async def search_pets(q: str = "", species: str = "", breed: str = "", limit: int = 20):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"breed": {"$regex": q, "$options": "i"}}
        ]
    if species:
        query["species"] = {"$regex": species, "$options": "i"}
    if breed:
        query["breed"] = {"$regex": breed, "$options": "i"}
    pets = await db.pets.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return pets

# ===== POST ROUTES =====

@api_router.post("/posts")
@limiter.limit("20/minute")
async def create_post(request: Request, data: PostCreate, user=Depends(get_current_user)):
    pet = await db.pets.find_one({"pet_id": data.pet_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=403, detail="Not your pet")
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    post_doc = {
        "post_id": post_id,
        "pet_id": data.pet_id,
        "owner_id": user["user_id"],
        "content": data.content,
        "image_path": data.image_path,
        "likes_count": 0,
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.posts.insert_one(post_doc)
    await db.pets.update_one({"pet_id": data.pet_id}, {"$inc": {"posts_count": 1}})
    post_doc.pop("_id", None)
    post_doc["pet"] = pet
    post_doc["owner"] = {k: v for k, v in user.items() if k not in ("password", "_id")}
    return post_doc

@api_router.get("/posts/feed")
async def get_feed(user=Depends(get_current_user), page: int = 1, limit: int = 20):
    skip = (page - 1) * limit
    my_pets = await db.pets.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    my_pet_ids = [p["pet_id"] for p in my_pets]
    # Get friends
    friendships = await db.friendships.find({
        "$or": [
            {"requester_pet_id": {"$in": my_pet_ids}, "status": "accepted"},
            {"receiver_pet_id": {"$in": my_pet_ids}, "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)
    friend_pet_ids = set()
    for f in friendships:
        friend_pet_ids.add(f["requester_pet_id"])
        friend_pet_ids.add(f["receiver_pet_id"])
    all_pet_ids = list(friend_pet_ids | set(my_pet_ids))
    posts = await db.posts.find(
        {"pet_id": {"$in": all_pet_ids}}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).to_list(limit)
    # Enrich posts
    for post in posts:
        pet = await db.pets.find_one({"pet_id": post["pet_id"]}, {"_id": 0})
        owner = await db.users.find_one({"user_id": post["owner_id"]}, {"_id": 0})
        post["pet"] = pet
        post["owner"] = {k: v for k, v in owner.items() if k not in ("password", "_id")} if owner else None
        # Check if current user liked
        user_liked = await db.likes.find_one({
            "post_id": post["post_id"],
            "user_id": user["user_id"]
        })
        post["user_liked"] = bool(user_liked)
    return posts

@api_router.get("/posts/pet/{pet_id}")
async def get_pet_posts(pet_id: str, page: int = 1, limit: int = 20):
    skip = (page - 1) * limit
    posts = await db.posts.find({"pet_id": pet_id}, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    for post in posts:
        pet = await db.pets.find_one({"pet_id": post["pet_id"]}, {"_id": 0})
        owner = await db.users.find_one({"user_id": post["owner_id"]}, {"_id": 0})
        post["pet"] = pet
        post["owner"] = {k: v for k, v in owner.items() if k not in ("password", "_id")} if owner else None
    return posts

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post or post["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.posts.delete_one({"post_id": post_id})
    await db.pets.update_one({"pet_id": post["pet_id"]}, {"$inc": {"posts_count": -1}})
    await db.comments.delete_many({"post_id": post_id})
    await db.likes.delete_many({"post_id": post_id})
    return {"message": "Post deleted"}

# ===== COMMENTS =====

@api_router.post("/comments/{post_id}")
@limiter.limit("30/minute")
async def create_comment(request: Request, post_id: str, data: CommentCreate, user=Depends(get_current_user)):
    comment_id = f"cmt_{uuid.uuid4().hex[:12]}"
    comment_doc = {
        "comment_id": comment_id,
        "post_id": post_id,
        "user_id": user["user_id"],
        "pet_id": data.pet_id,
        "content": data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_doc)
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"comments_count": 1}})
    comment_doc.pop("_id", None)
    pet = await db.pets.find_one({"pet_id": data.pet_id}, {"_id": 0})
    comment_doc["pet"] = pet
    return comment_doc

@api_router.get("/comments/{post_id}")
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    for c in comments:
        pet = await db.pets.find_one({"pet_id": c["pet_id"]}, {"_id": 0})
        c["pet"] = pet
    return comments

# ===== LIKES =====

@api_router.post("/likes/{post_id}")
@limiter.limit("60/minute")
async def toggle_like(request: Request, post_id: str, user=Depends(get_current_user)):
    existing = await db.likes.find_one({"post_id": post_id, "user_id": user["user_id"]})
    if existing:
        await db.likes.delete_one({"post_id": post_id, "user_id": user["user_id"]})
        await db.posts.update_one({"post_id": post_id}, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    else:
        await db.likes.insert_one({
            "like_id": f"like_{uuid.uuid4().hex[:12]}",
            "post_id": post_id,
            "user_id": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.posts.update_one({"post_id": post_id}, {"$inc": {"likes_count": 1}})
        return {"liked": True}

# ===== FRIENDS =====

@api_router.post("/friends/request")
@limiter.limit("15/minute")
async def send_friend_request(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    requester_pet_id = body.get("requester_pet_id")
    receiver_pet_id = body.get("receiver_pet_id")
    # Verify ownership
    requester_pet = await db.pets.find_one({"pet_id": requester_pet_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not requester_pet:
        raise HTTPException(status_code=403, detail="Not your pet")
    # Check existing
    existing = await db.friendships.find_one({
        "$or": [
            {"requester_pet_id": requester_pet_id, "receiver_pet_id": receiver_pet_id},
            {"requester_pet_id": receiver_pet_id, "receiver_pet_id": requester_pet_id}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Friend request already exists")
    friendship_id = f"fr_{uuid.uuid4().hex[:12]}"
    await db.friendships.insert_one({
        "friendship_id": friendship_id,
        "requester_pet_id": requester_pet_id,
        "receiver_pet_id": receiver_pet_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"friendship_id": friendship_id, "status": "pending"}

@api_router.post("/friends/respond")
async def respond_friend_request(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    friendship_id = body.get("friendship_id")
    action = body.get("action")  # accept or reject
    friendship = await db.friendships.find_one({"friendship_id": friendship_id}, {"_id": 0})
    if not friendship:
        raise HTTPException(status_code=404, detail="Request not found")
    receiver_pet = await db.pets.find_one({"pet_id": friendship["receiver_pet_id"], "owner_id": user["user_id"]}, {"_id": 0})
    if not receiver_pet:
        raise HTTPException(status_code=403, detail="Not authorized")
    if action == "accept":
        await db.friendships.update_one({"friendship_id": friendship_id}, {"$set": {"status": "accepted"}})
        await db.pets.update_one({"pet_id": friendship["requester_pet_id"]}, {"$inc": {"friends_count": 1}})
        await db.pets.update_one({"pet_id": friendship["receiver_pet_id"]}, {"$inc": {"friends_count": 1}})
        return {"status": "accepted"}
    else:
        await db.friendships.delete_one({"friendship_id": friendship_id})
        return {"status": "rejected"}

@api_router.get("/friends/{pet_id}")
async def get_friends(pet_id: str):
    friendships = await db.friendships.find({
        "$or": [
            {"requester_pet_id": pet_id, "status": "accepted"},
            {"receiver_pet_id": pet_id, "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)
    friends = []
    for f in friendships:
        friend_id = f["receiver_pet_id"] if f["requester_pet_id"] == pet_id else f["requester_pet_id"]
        friend_pet = await db.pets.find_one({"pet_id": friend_id}, {"_id": 0})
        if friend_pet:
            friends.append(friend_pet)
    return friends

@api_router.get("/friends/requests/pending")
async def get_pending_requests(user=Depends(get_current_user)):
    my_pets = await db.pets.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    my_pet_ids = [p["pet_id"] for p in my_pets]
    pending = await db.friendships.find({
        "receiver_pet_id": {"$in": my_pet_ids},
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    for p in pending:
        req_pet = await db.pets.find_one({"pet_id": p["requester_pet_id"]}, {"_id": 0})
        p["requester_pet"] = req_pet
    return pending

@api_router.get("/friends/status/{pet_id}")
async def get_friendship_status(pet_id: str, user=Depends(get_current_user)):
    my_pets = await db.pets.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    my_pet_ids = [p["pet_id"] for p in my_pets]
    for my_pet_id in my_pet_ids:
        friendship = await db.friendships.find_one({
            "$or": [
                {"requester_pet_id": my_pet_id, "receiver_pet_id": pet_id},
                {"requester_pet_id": pet_id, "receiver_pet_id": my_pet_id}
            ]
        }, {"_id": 0})
        if friendship:
            return {"status": friendship["status"], "friendship_id": friendship["friendship_id"], "my_pet_id": my_pet_id}
    return {"status": "none", "friendship_id": None, "my_pet_id": my_pet_ids[0] if my_pet_ids else None}

# ===== FILE UPLOAD =====

@api_router.post("/upload")
@limiter.limit("10/minute")
async def upload_file(request: Request, file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    file_id = f"file_{uuid.uuid4().hex[:12]}"
    await db.files.insert_one({
        "file_id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "user_id": user["user_id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"file_id": file_id, "path": result["path"]}

@api_router.get("/files/{path:path}")
async def download_file(path: str, auth: str = Query(None), authorization: str = Header(None)):
    # Allow either auth query param or Authorization header
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))

@api_router.put("/pets/{pet_id}/photo")
async def update_pet_photo(pet_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    pet = await db.pets.find_one({"pet_id": pet_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=403, detail="Not your pet")
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/pets/{pet_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    await db.pets.update_one({"pet_id": pet_id}, {"$set": {"profile_photo": result["path"]}})
    await db.files.insert_one({
        "file_id": f"file_{uuid.uuid4().hex[:12]}",
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "user_id": user["user_id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"path": result["path"]}

# ===== AI BIO GENERATION =====

@api_router.post("/ai/generate-bio")
@limiter.limit("5/minute")
async def generate_bio(request: Request, data: AIBioRequest, user=Depends(get_current_user)):
    # Check AI generation limits based on membership tier
    tier = user.get("membership_tier", "free")
    ai_generations_used = user.get("ai_generations_used", 0)
    
    # Tier limits: free=0, prime=5, pro=15, ultra=30, mega=unlimited
    tier_limits = {
        "free": 0,
        "prime": 5,
        "pro": 15,
        "ultra": 30,
        "mega": 999999  # Unlimited
    }
    
    limit = tier_limits.get(tier, 0)
    
    # Check if user exceeded limit
    if ai_generations_used >= limit:
        return {
            "error": "AI generation limit reached",
            "message": f"You've used {ai_generations_used}/{limit} AI generations. Upgrade your membership or purchase more generations.",
            "used": ai_generations_used,
            "limit": limit,
            "tier": tier,
            "upgrade_required": True
        }
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"bio_{uuid.uuid4().hex[:8]}",
            system_message="You are a creative pet bio writer. Write fun, engaging, and personality-filled bios for pets. Keep it under 150 words. Write in first person from the pet's perspective."
        ).with_model("openai", "gpt-5.2")
        traits = ", ".join(data.personality_traits) if data.personality_traits else "friendly"
        activities = ", ".join(data.favorite_activities) if data.favorite_activities else "playing"
        msg = UserMessage(text=f"Write a fun social media bio for {data.pet_name}, a {data.breed} {data.species}. Personality traits: {traits}. Favorite activities: {activities}.")
        response = await chat.send_message(msg)
        
        # Increment AI generations used
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"ai_generations_used": 1}}
        )
        
        return {
            "bio": response,
            "used": ai_generations_used + 1,
            "limit": limit,
            "tier": tier,
            "remaining": limit - (ai_generations_used + 1) if tier != "mega" else "unlimited"
        }
    except Exception as e:
        logger.error(f"AI bio generation failed: {e}")
        return {"bio": f"Hi, I'm {data.pet_name}! I'm a lovable {data.breed} {data.species} who enjoys life to the fullest!"}

@api_router.post("/ai/purchase-generations")
async def purchase_ai_generations(user=Depends(get_current_user)):
    """Purchase 10 additional AI generations for $2.99"""
    # This would integrate with Stripe for payment
    # For now, return purchase details
    return {
        "product": "AI Generation Pack",
        "quantity": 10,
        "price": 2.99,
        "description": "10 additional AI-generated bios for your pets"
    }

@api_router.get("/ai/usage")
async def get_ai_usage(user=Depends(get_current_user)):
    """Get current AI generation usage stats"""
    tier = user.get("membership_tier", "free")
    ai_generations_used = user.get("ai_generations_used", 0)
    
    tier_limits = {
        "free": 0,
        "prime": 5,
        "pro": 15,
        "ultra": 30,
        "mega": 999999
    }
    
    limit = tier_limits.get(tier, 0)
    
    return {
        "tier": tier,
        "used": ai_generations_used,
        "limit": limit if tier != "mega" else "unlimited",
        "remaining": limit - ai_generations_used if tier != "mega" else "unlimited",
        "can_purchase_more": True
    }

# ===== STRIPE MEMBERSHIP ROUTES =====

import stripe
stripe.api_key = STRIPE_API_KEY

@api_router.get("/stripe/config")
async def stripe_config():
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY, "plans": MEMBERSHIP_PLANS}

@api_router.post("/stripe/create-checkout")
@limiter.limit("10/minute")
async def create_checkout(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    plan_id = body.get("plan_id")
    plan = MEMBERSHIP_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    amount = plan["amount"]
    if plan_id == "donation_custom":
        amount = float(body.get("amount", 5))
        if amount < 1:
            raise HTTPException(status_code=400, detail="Minimum donation is $1")
    # Create or get Stripe customer
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        customer = stripe.Customer.create(email=user["email"], name=user["name"])
        customer_id = customer.id
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"stripe_customer_id": customer_id}})
    # Build line items
    line_items = [{
        "price_data": {
            "currency": "usd",
            "unit_amount": int(amount * 100),
            "product_data": {"name": plan["name"]},
        },
        "quantity": 1,
    }]
    # Add recurring for subscription plans
    if plan["period"] in ("week", "month", "year") and plan["tier"] != "none":
        interval = "week" if plan["period"] == "week" else "month" if plan["period"] == "month" else "year"
        line_items[0]["price_data"]["recurring"] = {"interval": interval}
        session_params = {
            "mode": "subscription",
            "customer": customer_id,
            "line_items": line_items,
            "success_url": body.get("success_url", "https://petbookin.com/feed?payment=success"),
            "cancel_url": body.get("cancel_url", "https://petbookin.com/membership?payment=cancelled"),
            "metadata": {"user_id": user["user_id"], "plan_id": plan_id, "tier": plan["tier"]},
        }
        # Add 7-day free trial for subscription plans
        if plan["tier"] in ("prime", "pro", "ultra", "mega"):
            session_params["subscription_data"] = {"trial_period_days": 7}
    else:
        session_params = {
            "mode": "payment",
            "customer": customer_id,
            "line_items": line_items,
            "success_url": body.get("success_url", "https://petbookin.com/feed?payment=success"),
            "cancel_url": body.get("cancel_url", "https://petbookin.com/membership?payment=cancelled"),
            "metadata": {"user_id": user["user_id"], "plan_id": plan_id, "tier": plan.get("tier", "none")},
        }
    
    # Add payment method types (Google Pay, Apple Pay auto-enabled when available)
    session_params["payment_method_types"] = ["card", "cashapp", "link"]
    # Note: Google Pay, Apple Pay, Samsung Pay auto-appear when user's device/browser supports them
    # PayPal requires separate setup in Stripe Dashboard
    
    session = stripe.checkout.Session.create(**session_params)
    # Log transaction
    await db.transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "plan_id": plan_id,
        "stripe_session_id": session.id,
        "amount": amount,
        "tier": plan.get("tier", "none"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"checkout_url": session.url, "session_id": session.id}

@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    
    # Verify webhook signature for security
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Fallback if no webhook secret (for testing)
        try:
            event = stripe.Event.construct_from(
                stripe.util.convert_to_dict(stripe.util.json.loads(payload)), stripe.api_key
            )
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            raise HTTPException(status_code=400, detail="Webhook error")
    
    # Handle events
    if event.type == "checkout.session.completed":
        session = event.data.object
        metadata = session.get("metadata", {})
        user_id = metadata.get("user_id")
        plan_id = metadata.get("plan_id")
        tier = metadata.get("tier", "free")
        if user_id and tier and tier != "none":
            await db.users.update_one({"user_id": user_id}, {"$set": {
                "membership_tier": tier,
                "membership_status": "active",
                "membership_plan": plan_id,
                "membership_started": datetime.now(timezone.utc).isoformat()
            }})
        # Update transaction
        await db.transactions.update_one(
            {"stripe_session_id": session.id},
            {"$set": {"status": "completed"}}
        )
        # Log donation if applicable
        if plan_id and "donation" in plan_id:
            await db.donations.insert_one({
                "donation_id": f"don_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "amount": session.get("amount_total", 0) / 100,
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        logger.info(f"Checkout completed for user {user_id}, tier: {tier}")
    elif event.type == "customer.subscription.deleted":
        subscription = event.data.object
        customer_id = subscription.get("customer")
        user = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0})
        if user:
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
                "membership_tier": "free",
                "membership_status": "cancelled"
            }})
            logger.info(f"Subscription cancelled for user {user['user_id']}")
    elif event.type == "customer.subscription.updated":
        subscription = event.data.object
        customer_id = subscription.get("customer")
        status = subscription.get("status")
        user = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0})
        if user:
            membership_status = "active" if status == "active" else "cancelled"
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
                "membership_status": membership_status
            }})
            logger.info(f"Subscription updated for user {user['user_id']}, status: {membership_status}")
    
    return {"status": "ok"}

@api_router.get("/membership/status")
async def membership_status(user=Depends(get_current_user)):
    return {
        "tier": user.get("membership_tier", "free"),
        "status": user.get("membership_status", "none"),
        "plan": user.get("membership_plan", ""),
        "started": user.get("membership_started", ""),
        "account_type": user.get("account_type", "pet_owner"),
        "petbookin_breeder_id": user.get("petbookin_breeder_id", "")
    }

# ===== DONATIONS =====

@api_router.get("/donations/total")
async def donations_total():
    pipeline = [{"$match": {"status": "completed"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}]
    result = await db.donations.aggregate(pipeline).to_list(1)
    if result:
        return {"total": result[0]["total"], "count": result[0]["count"]}
    return {"total": 0, "count": 0}

@api_router.get("/donations/recent")
async def donations_recent():
    donations = await db.donations.find({"status": "completed"}, {"_id": 0}).sort("created_at", -1).to_list(10)
    for d in donations:
        user = await db.users.find_one({"user_id": d["user_id"]}, {"_id": 0, "password": 0})
        d["donor_name"] = user.get("name", "Anonymous") if user else "Anonymous"
    return donations

# ===== PROMOTED LISTINGS =====

@api_router.get("/listings/promoted")
async def get_promoted_listings():
    now = datetime.now(timezone.utc).isoformat()
    promoted = await db.promoted_listings.find({"expires_at": {"$gt": now}}, {"_id": 0}).sort("created_at", -1).to_list(20)
    for p in promoted:
        pet = await db.pets.find_one({"pet_id": p["pet_id"]}, {"_id": 0})
        p["pet"] = pet
    return promoted

@api_router.post("/listings/promote")
async def promote_listing(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    pet_id = body.get("pet_id")
    pet = await db.pets.find_one({"pet_id": pet_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=403, detail="Not your pet")
    listing_id = f"promo_{uuid.uuid4().hex[:12]}"
    await db.promoted_listings.insert_one({
        "listing_id": listing_id,
        "pet_id": pet_id,
        "user_id": user["user_id"],
        "status": "pending_payment",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"listing_id": listing_id, "message": "Proceed to payment"}

# ===== ADMIN HELPERS =====

ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'petbook_admin_2026')

async def require_admin(request: Request, authorization: str = Header(None)):
    user = await get_current_user(request, authorization)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ===== BREEDER REGISTRY & EVENTS =====

@api_router.post("/breeder/events")
async def create_breeder_event(data: BreederEventCreate, admin=Depends(require_admin)):
    """Admin creates breeder events/tournaments"""
    event_id = f"event_{uuid.uuid4().hex[:12]}"
    event_doc = {
        "event_id": event_id,
        **data.model_dump(),
        "registrations": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["user_id"]
    }
    await db.breeder_events.insert_one(event_doc)
    event_doc.pop("_id", None)
    return event_doc

@api_router.get("/breeder/events")
async def list_breeder_events(upcoming: bool = True):
    """List all breeder events/tournaments"""
    query = {}
    if upcoming:
        now = datetime.now(timezone.utc).isoformat()
        query["date"] = {"$gte": now[:10]}  # Compare dates only
    events = await db.breeder_events.find(query, {"_id": 0}).sort("date", 1).to_list(50)
    return events

@api_router.post("/breeder/events/register")
async def register_for_event(data: BreederEventRegistration, user=Depends(get_current_user)):
    """Breeder registers their pet for an event"""
    # Check if user has Petbookin Breeder ID
    if not user.get("petbookin_breeder_id"):
        raise HTTPException(status_code=403, detail="Petbookin Breeder ID required. Please create a breeder profile.")
    
    # Check if pet belongs to user
    pet = await db.pets.find_one({"pet_id": data.pet_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=403, detail="Not your pet")
    
    # Check if event exists
    event = await db.breeder_events.find_one({"event_id": data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Create registration
    registration_id = f"reg_{uuid.uuid4().hex[:12]}"
    registration_doc = {
        "registration_id": registration_id,
        "event_id": data.event_id,
        "pet_id": data.pet_id,
        "user_id": user["user_id"],
        "petbookin_breeder_id": user["petbookin_breeder_id"],
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "status": "registered"
    }
    await db.event_registrations.insert_one(registration_doc)
    registration_doc.pop("_id", None)
    return registration_doc

@api_router.get("/breeder/events/{event_id}/registrations")
async def get_event_registrations(event_id: str):
    """Get all registrations for an event"""
    registrations = await db.event_registrations.find({"event_id": event_id}, {"_id": 0}).to_list(100)
    for reg in registrations:
        pet = await db.pets.find_one({"pet_id": reg["pet_id"]}, {"_id": 0})
        owner = await db.users.find_one({"user_id": reg["user_id"]}, {"_id": 0, "password": 0})
        reg["pet"] = pet
        reg["owner"] = owner
    return registrations

@api_router.post("/breeder/awards")
async def create_award(data: BreederAward, admin=Depends(require_admin)):
    """Admin creates awards for event participants"""
    award_id = f"award_{uuid.uuid4().hex[:12]}"
    
    # Get pet and owner info
    pet = await db.pets.find_one({"pet_id": data.pet_id}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    owner = await db.users.find_one({"user_id": pet["owner_id"]}, {"_id": 0})
    
    award_doc = {
        "award_id": award_id,
        **data.model_dump(),
        "pet_name": pet["name"],
        "pet_breed": pet["breed"],
        "owner_name": owner["name"],
        "petbookin_breeder_id": owner.get("petbookin_breeder_id", ""),
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "issued_by": admin["user_id"]
    }
    await db.breeder_awards.insert_one(award_doc)
    
    # Update owner's points
    points_earned = data.points
    await db.users.update_one(
        {"user_id": pet["owner_id"]},
        {"$inc": {"breeder_points": points_earned}}
    )
    
    award_doc.pop("_id", None)
    return award_doc

@api_router.get("/breeder/awards/my")
async def get_my_awards(user=Depends(get_current_user)):
    """Get all awards for the current user's pets"""
    my_pets = await db.pets.find({"owner_id": user["user_id"]}, {"_id": 0}).to_list(100)
    pet_ids = [p["pet_id"] for p in my_pets]
    awards = await db.breeder_awards.find({"pet_id": {"$in": pet_ids}}, {"_id": 0}).sort("issued_at", -1).to_list(100)
    return awards

@api_router.get("/breeder/certificate/{award_id}")
async def get_certificate(award_id: str):
    """Generate certificate for an award"""
    award = await db.breeder_awards.find_one({"award_id": award_id}, {"_id": 0})
    if not award:
        raise HTTPException(status_code=404, detail="Award not found")
    
    event = await db.breeder_events.find_one({"event_id": award["event_id"]}, {"_id": 0})
    
    certificate = {
        "award_id": award_id,
        "certificate_number": f"CERT-{award_id.upper()}",
        "title": "OFFICIAL PETBOOKIN CERTIFICATE",
        "awarded_to": award["owner_name"],
        "petbookin_breeder_id": award["petbookin_breeder_id"],
        "pet_name": award["pet_name"],
        "pet_breed": award["pet_breed"],
        "award_title": award["award_title"],
        "award_type": award["award_type"],
        "event_title": event["title"] if event else "Petbookin Event",
        "event_date": event["date"] if event else "",
        "issued_date": award["issued_at"],
        "points_earned": award["points"],
        "signature": "Petbookin Registry Authority",
        "seal": "Official Petbookin Breeder Registry Seal"
    }
    return certificate

@api_router.get("/breeder/leaderboard")
async def breeder_leaderboard(limit: int = 50):
    """Get top breeders by points"""
    breeders = await db.users.find(
        {"petbookin_breeder_id": {"$ne": ""}},
        {"_id": 0, "password": 0}
    ).sort("breeder_points", -1).to_list(limit)
    return breeders

# ===== ADMIN ROUTES =====

@api_router.post("/admin/assign-breeder-id/{user_id}")
async def admin_assign_breeder_id(user_id: str, admin=Depends(require_admin)):
    """Admin endpoint to manually assign Petbookin Breeder ID to a user"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("petbookin_breeder_id"):
        return {
            "message": "User already has Petbookin Breeder ID",
            "petbookin_breeder_id": user["petbookin_breeder_id"]
        }
    
    # Generate and assign breeder ID
    breeder_id = f"PBK-BR-{uuid.uuid4().hex[:8].upper()}"
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "petbookin_breeder_id": breeder_id,
                "ai_generations_used": 0,
                "breeder_points": 0
            }
        }
    )
    
    logger.info(f"Admin assigned Petbookin Breeder ID {breeder_id} to user {user_id}")
    
    return {
        "message": "Petbookin Breeder ID assigned successfully",
        "petbookin_breeder_id": breeder_id,
        "user_email": user["email"],
        "user_name": user["name"]
    }

@api_router.post("/admin/set-mega-tier/{user_id}")
async def admin_set_mega_tier(user_id: str, admin=Depends(require_admin)):
    """Admin endpoint to set a user to MEGA tier (for owner/testing)"""
    result = await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "membership_tier": "mega",
                "membership_status": "active",
                "ai_generations_used": 0
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    
    logger.info(f"Admin set user {user_id} to MEGA tier")
    
    return {
        "message": "User upgraded to MEGA tier successfully",
        "user_email": user["email"],
        "user_name": user["name"],
        "membership_tier": "mega",
        "membership_status": "active",
        "ai_generations": "unlimited"
    }

@api_router.post("/user/claim-mega-tier")
async def claim_mega_tier(user=Depends(get_current_user)):
    """Allow owner/admin to claim MEGA tier without payment"""
    # Only admins can claim free MEGA tier
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only admins can claim free MEGA tier")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "membership_tier": "mega",
                "membership_status": "active",
                "ai_generations_used": 0
            }
        }
    )
    
    logger.info(f"Admin {user['email']} claimed MEGA tier")
    
    return {
        "message": "MEGA tier activated successfully!",
        "membership_tier": "mega",
        "membership_status": "active",
        "ai_generations": "unlimited",
        "features": [
            "Unlimited AI-generated bios",
            "Unlimited listings",
            "Priority support",
            "All premium features",
            "Breeder registry access",
            "Event creation",
            "Certificate generation"
        ]
    }

@api_router.post("/admin/setup")
async def admin_setup(request: Request):
    """One-time setup: promote a user to admin using the admin secret."""
    body = await request.json()
    secret = body.get("admin_secret")
    email = body.get("email")
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"email": email}, {"$set": {"is_admin": True}})
    return {"message": f"{email} is now an admin"}

@api_router.get("/admin/dashboard")
async def admin_dashboard(admin=Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_pets = await db.pets.count_documents({})
    total_posts = await db.posts.count_documents({})
    total_comments = await db.comments.count_documents({})
    total_likes = await db.likes.count_documents({})
    total_friendships = await db.friendships.count_documents({"status": "accepted"})
    banned_users = await db.users.count_documents({"is_banned": True})
    pending_verifications = await db.users.count_documents({"kennel_club": {"$ne": ""}, "kennel_verified": {"$ne": True}})
    pending_reports = await db.reports.count_documents({"status": "pending"})
    # Recent signups (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_users = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    recent_posts = await db.posts.count_documents({"created_at": {"$gte": week_ago}})
    return {
        "total_users": total_users,
        "total_pets": total_pets,
        "total_posts": total_posts,
        "total_comments": total_comments,
        "total_likes": total_likes,
        "total_friendships": total_friendships,
        "banned_users": banned_users,
        "pending_verifications": pending_verifications,
        "pending_reports": pending_reports,
        "recent_users_7d": recent_users,
        "recent_posts_7d": recent_posts
    }

@api_router.get("/admin/users")
async def admin_list_users(admin=Depends(require_admin), page: int = 1, limit: int = 20, q: str = ""):
    skip = (page - 1) * limit
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}}
        ]
    users = await db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    total = await db.users.count_documents(query)
    # Enrich with pet count
    for u in users:
        u["pet_count"] = await db.pets.count_documents({"owner_id": u["user_id"]})
        u["post_count"] = await db.posts.count_documents({"owner_id": u["user_id"]})
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/users/{user_id}/ban")
async def admin_ban_user(user_id: str, admin=Depends(require_admin)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = not user.get("is_banned", False)
    await db.users.update_one({"user_id": user_id}, {"$set": {"is_banned": new_status}})
    return {"user_id": user_id, "is_banned": new_status}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin=Depends(require_admin)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Cannot delete an admin")
    # Delete user's pets, posts, comments, likes, friendships
    pet_ids = [p["pet_id"] for p in await db.pets.find({"owner_id": user_id}, {"pet_id": 1, "_id": 0}).to_list(100)]
    await db.posts.delete_many({"owner_id": user_id})
    await db.comments.delete_many({"user_id": user_id})
    await db.likes.delete_many({"user_id": user_id})
    await db.friendships.delete_many({"$or": [
        {"requester_pet_id": {"$in": pet_ids}},
        {"receiver_pet_id": {"$in": pet_ids}}
    ]})
    await db.pets.delete_many({"owner_id": user_id})
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"message": f"User {user_id} and all related data deleted"}

@api_router.get("/admin/posts")
async def admin_list_posts(admin=Depends(require_admin), page: int = 1, limit: int = 20):
    skip = (page - 1) * limit
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    total = await db.posts.count_documents({})
    for post in posts:
        pet = await db.pets.find_one({"pet_id": post["pet_id"]}, {"_id": 0})
        owner = await db.users.find_one({"user_id": post["owner_id"]}, {"_id": 0, "password": 0})
        post["pet"] = pet
        post["owner"] = owner
    return {"posts": posts, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.delete("/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, admin=Depends(require_admin)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.posts.delete_one({"post_id": post_id})
    await db.pets.update_one({"pet_id": post["pet_id"]}, {"$inc": {"posts_count": -1}})
    await db.comments.delete_many({"post_id": post_id})
    await db.likes.delete_many({"post_id": post_id})
    return {"message": "Post deleted"}

@api_router.get("/admin/verifications")
async def admin_list_verifications(admin=Depends(require_admin)):
    users = await db.users.find(
        {"kennel_club": {"$ne": ""}, "kennel_verified": {"$ne": True}},
        {"_id": 0, "password": 0}
    ).to_list(100)
    for u in users:
        u["pet_count"] = await db.pets.count_documents({"owner_id": u["user_id"]})
    return users

@api_router.put("/admin/verifications/{user_id}")
async def admin_verify_kennel(user_id: str, request: Request, admin=Depends(require_admin)):
    body = await request.json()
    action = body.get("action")  # approve or reject
    if action == "approve":
        await db.users.update_one({"user_id": user_id}, {"$set": {"kennel_verified": True}})
        return {"message": "Kennel verification approved", "status": "approved"}
    else:
        await db.users.update_one({"user_id": user_id}, {"$set": {"kennel_club": "", "kennel_registration": "", "kennel_verified": False}})
        return {"message": "Kennel verification rejected", "status": "rejected"}

@api_router.post("/admin/add-admin")
async def admin_add_admin(request: Request, admin=Depends(require_admin)):
    body = await request.json()
    email = body.get("email")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    admin_count = await db.users.count_documents({"is_admin": True})
    if admin_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 admins allowed")
    await db.users.update_one({"email": email}, {"$set": {"is_admin": True}})
    return {"message": f"{email} is now an admin"}

@api_router.post("/admin/remove-admin")
async def admin_remove_admin(request: Request, admin=Depends(require_admin)):
    body = await request.json()
    email = body.get("email")
    if email == admin.get("email"):
        raise HTTPException(status_code=400, detail="Cannot remove yourself as admin")
    await db.users.update_one({"email": email}, {"$set": {"is_admin": False}})
    return {"message": f"{email} is no longer an admin"}

@api_router.get("/admin/admins")
async def admin_list_admins(admin=Depends(require_admin)):
    admins = await db.users.find({"is_admin": True}, {"_id": 0, "password": 0}).to_list(10)
    return admins

# ===== CONTENT REPORTING =====

@api_router.post("/reports")
@limiter.limit("10/minute")
async def create_report(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    target_id = body.get("target_id")
    target_type = body.get("target_type", "post")
    # Prevent duplicate reports from same user
    existing = await db.reports.find_one({
        "reporter_id": user["user_id"],
        "target_id": target_id,
        "target_type": target_type,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reported this content")
    # Prevent self-reporting
    if target_type == "post":
        post = await db.posts.find_one({"post_id": target_id}, {"_id": 0})
        if post and post.get("owner_id") == user["user_id"]:
            raise HTTPException(status_code=400, detail="Cannot report your own content")
    report_id = f"rpt_{uuid.uuid4().hex[:12]}"
    report_doc = {
        "report_id": report_id,
        "reporter_id": user["user_id"],
        "target_type": target_type,  # post, user, or comment
        "target_id": target_id,
        "reason": body.get("reason", ""),
        "category": body.get("category", "other"),  # spam, inappropriate, harassment, misinformation, other
        "details": body.get("details", ""),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reports.insert_one(report_doc)
    return {"report_id": report_id, "status": "pending"}

@api_router.get("/admin/reports")
async def admin_list_reports(admin=Depends(require_admin), status: str = "pending"):
    query = {"status": status} if status != "all" else {}
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for r in reports:
        reporter = await db.users.find_one({"user_id": r["reporter_id"]}, {"_id": 0, "password": 0})
        r["reporter"] = reporter
        if r["target_type"] == "post":
            target = await db.posts.find_one({"post_id": r["target_id"]}, {"_id": 0})
            r["target"] = target
        elif r["target_type"] == "user":
            target = await db.users.find_one({"user_id": r["target_id"]}, {"_id": 0, "password": 0})
            r["target"] = target
    return reports

@api_router.put("/admin/reports/{report_id}")
async def admin_resolve_report(report_id: str, request: Request, admin=Depends(require_admin)):
    body = await request.json()
    action = body.get("action")  # resolve or dismiss
    await db.reports.update_one({"report_id": report_id}, {"$set": {
        "status": "resolved" if action == "resolve" else "dismissed",
        "resolved_by": admin["user_id"],
        "resolved_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"message": f"Report {action}d"}

# ===== STARTUP =====

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.pets.create_index("owner_id")
    await db.pets.create_index("pet_id", unique=True)
    await db.posts.create_index("pet_id")
    await db.posts.create_index([("created_at", -1)])
    await db.friendships.create_index("requester_pet_id")
    await db.friendships.create_index("receiver_pet_id")
    await db.reports.create_index("status")
    logger.info("Petbookin backend started")

app.include_router(api_router)

# Health check endpoint (for deployment)
@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": "petbookin"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
