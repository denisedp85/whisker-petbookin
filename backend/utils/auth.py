import os
import jwt
import bcrypt
import uuid
import requests
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request


JWT_SECRET = os.environ.get('JWT_SECRET')

# === PASSWORD HELPERS ===
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# === JWT HELPERS ===
def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# === USER ID GENERATOR ===
def generate_user_id():
    return f"user_{uuid.uuid4().hex[:12]}"

def generate_pet_id():
    return f"pet_{uuid.uuid4().hex[:12]}"

def generate_post_id():
    return f"post_{uuid.uuid4().hex[:12]}"

def generate_comment_id():
    return f"cmt_{uuid.uuid4().hex[:12]}"

def generate_breeder_id():
    import random
    return f"PBK-BR-{random.randint(100000, 999999)}"

# === AUTH MIDDLEWARE ===
async def get_current_user(request: Request, db):
    # Check session_token cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one(
            {"session_token": session_token}, {"_id": 0}
        )
        if session:
            expires_at = session["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one(
                    {"user_id": session["user_id"]}, {"_id": 0}
                )
                if user:
                    return user

    # Fall back to Authorization header (JWT)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        # Check if it's a session token
        session = await db.user_sessions.find_one(
            {"session_token": token}, {"_id": 0}
        )
        if session:
            expires_at = session["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one(
                    {"user_id": session["user_id"]}, {"_id": 0}
                )
                if user:
                    return user
        # Try JWT
        try:
            payload = decode_jwt(token)
            user = await db.users.find_one(
                {"user_id": payload["user_id"]}, {"_id": 0}
            )
            if user:
                return user
        except Exception:
            pass

    raise HTTPException(status_code=401, detail="Not authenticated")


# === GOOGLE OAUTH ===
def fetch_google_session(session_id: str) -> dict:
    resp = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": session_id},
        timeout=10
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    return resp.json()
