from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# === AUTH MODELS ===
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    account_type: str = "owner"

class UserLogin(BaseModel):
    email: str
    password: str

class GoogleSession(BaseModel):
    session_id: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None
    bio: Optional[str] = None

class ThemeUpdate(BaseModel):
    bg_color: Optional[str] = None
    card_bg: Optional[str] = None
    text_color: Optional[str] = None
    accent_color: Optional[str] = None
    music_url: Optional[str] = None
    video_bg_url: Optional[str] = None
    avatar_border: Optional[str] = None


# === PET MODELS ===
class PetCreate(BaseModel):
    name: str
    species: str
    breed: str = ""
    age: str = ""
    bio: str = ""
    gender: str = ""

class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    age: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[str] = None


# === BREEDER MODELS ===
class BreederRegister(BaseModel):
    kennel_name: str = ""
    specializations: List[str] = []
    years_experience: int = 0

class ExternalCredential(BaseModel):
    registry: str  # AKC, CKC, UKC, etc.
    registry_id: str
    breed_registered: str = ""

class PetbookinCredentialRequest(BaseModel):
    reason: str = ""


# === FEED MODELS ===
class PostCreate(BaseModel):
    content: str
    pet_id: Optional[str] = None

class CommentCreate(BaseModel):
    content: str


# === ADMIN MODELS ===
class RoleAssign(BaseModel):
    user_id: str
    role: str  # user, moderator, manager
    role_title: str = ""

class TierAssign(BaseModel):
    user_id: str
    tier: str


# === AI MODELS ===
class BioGenerate(BaseModel):
    pet_id: str
    style: str = "friendly"
