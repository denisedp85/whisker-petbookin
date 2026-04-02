from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Query, Header
from fastapi.responses import Response
from datetime import datetime, timezone
from utils.auth import get_current_user
import requests
import uuid
import os
import logging

router = APIRouter(prefix="/uploads", tags=["Uploads"])
logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = os.environ.get("APP_NAME", "petbookin")
storage_key = None

ALLOWED_TYPES = {
    "image": ["image/jpeg", "image/png", "image/webp", "image/gif"],
    "video": ["video/mp4", "video/webm", "video/quicktime"],
    "audio": ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-m4a"],
}
ALL_ALLOWED = [t for types in ALLOWED_TYPES.values() for t in types]
MAX_SIZE = 50 * 1024 * 1024  # 50MB


def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise Exception("EMERGENT_LLM_KEY not set")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    logger.info("Storage initialized")
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


@router.post("/file")
async def upload_file(request: Request, file: UploadFile = File(...)):
    db = request.app.state.db
    user = await get_current_user(request, db)

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALL_ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {content_type}")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    file_id = uuid.uuid4().hex[:16]
    path = f"{APP_NAME}/uploads/{user['user_id']}/{file_id}.{ext}"

    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

    now = datetime.now(timezone.utc)
    file_doc = {
        "file_id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "owner_id": user["user_id"],
        "is_deleted": False,
        "created_at": now,
    }
    await db.files.insert_one(file_doc)

    # Determine media category
    media_type = "file"
    for cat, types in ALLOWED_TYPES.items():
        if content_type in types:
            media_type = cat
            break

    return {
        "file_id": file_id,
        "storage_path": result["path"],
        "media_type": media_type,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "original_filename": file.filename,
    }


@router.get("/files/{path:path}")
async def download_file(path: str, request: Request, auth: str = Query(None)):
    db = request.app.state.db

    # Support query param auth for img/video/audio src tags
    auth_header = request.headers.get("Authorization")
    if not auth_header and auth:
        auth_header = f"Bearer {auth}"

    if not auth_header:
        raise HTTPException(status_code=401, detail="Authentication required")

    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        data, ct = get_object(path)
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

    return Response(content=data, media_type=record.get("content_type", ct))
