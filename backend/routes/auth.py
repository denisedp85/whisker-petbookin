from fastapi import APIRouter, HTTPException, Request, Response
from datetime import datetime, timezone, timedelta
from models.schemas import UserRegister, UserLogin, GoogleSession, ProfileUpdate, ThemeUpdate
from utils.auth import (
    hash_password, verify_password, create_jwt, generate_user_id,
    get_current_user, fetch_google_session
)
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])

DEFAULT_PROFILE_THEME = {
    "bg_color": "#FFFDF9",
    "card_bg": "#FFFFFF",
    "text_color": "#28211E",
    "accent_color": "#FF7A6A",
    "music_url": None,
    "video_bg_url": None,
    "avatar_border": "default"
}

AI_LIMITS = {
    "free": 0,
    "prime": 10,
    "pro": 50,
    "ultra": 250,
    "mega": 999999
}


def get_db(request: Request):
    return request.app.state.db


@router.post("/register")
async def register(data: UserRegister, request: Request, response: Response):
    db = get_db(request)
    existing = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = generate_user_id()
    now = datetime.now(timezone.utc)

    user_doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "name": data.name,
        "picture": "",
        "bio": "",
        "account_type": data.account_type,
        "membership_tier": "free",
        "membership_status": "inactive",
        "membership_expires_at": None,
        "role": "user",
        "role_title": "",
        "role_badge": "",
        "is_admin": False,
        "breeder_info": None,
        "ai_generations_used": 0,
        "points": 0,
        "profile_theme": DEFAULT_PROFILE_THEME.copy(),
        "created_at": now,
        "updated_at": now
    }
    await db.users.insert_one(user_doc)

    token = create_jwt(user_id)
    session_token = f"sess_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": now + timedelta(days=7),
        "created_at": now
    })

    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/",
        max_age=7 * 24 * 3600
    )

    user_out = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}
    return {"token": token, "session_token": session_token, "user": user_out}


@router.post("/login")
async def login(data: UserLogin, request: Request, response: Response):
    db = get_db(request)
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    now = datetime.now(timezone.utc)
    token = create_jwt(user["user_id"])
    session_token = f"sess_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": now + timedelta(days=7),
        "created_at": now
    })

    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/",
        max_age=7 * 24 * 3600
    )

    user_out = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "session_token": session_token, "user": user_out}


@router.post("/google-session")
async def google_session(data: GoogleSession, request: Request, response: Response):
    db = get_db(request)
    session_data = fetch_google_session(data.session_id)

    email = session_data["email"].lower()
    name = session_data.get("name", "")
    picture = session_data.get("picture", "")
    google_session_token = session_data.get("session_token", "")

    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": email}, {"_id": 0})

    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"picture": picture, "name": name or existing["name"], "updated_at": now}}
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = generate_user_id()
        user_doc = {
            "user_id": user_id,
            "email": email,
            "password_hash": None,
            "name": name,
            "picture": picture,
            "bio": "",
            "account_type": "owner",
            "membership_tier": "free",
            "membership_status": "inactive",
            "membership_expires_at": None,
            "role": "user",
            "role_title": "",
            "role_badge": "",
            "is_admin": False,
            "breeder_info": None,
            "ai_generations_used": 0,
            "points": 0,
            "profile_theme": DEFAULT_PROFILE_THEME.copy(),
            "created_at": now,
            "updated_at": now
        }
        await db.users.insert_one(user_doc)
        user = {k: v for k, v in user_doc.items() if k != "_id"}

    session_token = google_session_token or f"sess_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": now + timedelta(days=7),
        "created_at": now
    })

    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/",
        max_age=7 * 24 * 3600
    )

    token = create_jwt(user_id)
    user_out = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "session_token": session_token, "user": user_out}


@router.get("/me")
async def get_me(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    user_out = {k: v for k, v in user.items() if k != "password_hash"}
    return user_out


@router.put("/profile")
async def update_profile(data: ProfileUpdate, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {k: v for k, v in updated.items() if k != "password_hash"}


@router.put("/theme")
async def update_theme(data: ThemeUpdate, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    theme = user.get("profile_theme", DEFAULT_PROFILE_THEME.copy())
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    theme.update(updates)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"profile_theme": theme, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"profile_theme": theme}


@router.post("/logout")
async def logout(request: Request, response: Response):
    db = get_db(request)
    session_token = request.cookies.get("session_token")
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]

    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    if token:
        await db.user_sessions.delete_one({"session_token": token})

    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}
