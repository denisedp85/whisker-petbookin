from fastapi import APIRouter, HTTPException, Request
from models.schemas import BioGenerate
from utils.auth import get_current_user
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])

AI_LIMITS = {
    "free": 0,
    "prime": 10,
    "pro": 50,
    "ultra": 250,
    "mega": 999999
}


def get_db(request: Request):
    return request.app.state.db


@router.post("/generate-bio")
async def generate_bio(data: BioGenerate, request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)

    tier = user.get("membership_tier", "free")
    limit = AI_LIMITS.get(tier, 0)
    used = user.get("ai_generations_used", 0)

    if tier == "free":
        raise HTTPException(status_code=403, detail="AI bios require a subscription. Upgrade to Prime or higher!")

    if used >= limit:
        raise HTTPException(status_code=403, detail=f"AI generation limit reached ({used}/{limit}). Upgrade your tier for more!")

    pet = await db.pets.find_one({"pet_id": data.pet_id}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    style_prompts = {
        "friendly": "Write a warm, friendly, and endearing bio",
        "professional": "Write a professional, polished breeder-quality bio",
        "funny": "Write a hilarious, witty bio from the pet's perspective",
        "poetic": "Write a beautiful, poetic bio with vivid imagery",
        "adventurous": "Write an exciting, adventure-filled bio"
    }

    style_text = style_prompts.get(data.style, style_prompts["friendly"])
    tier_bonus = ""
    if tier in ["ultra", "mega"]:
        tier_bonus = " Include detailed personality traits, fun facts, and a catchy tagline."
    if tier == "mega":
        tier_bonus += " Also include a creative origin story and make it extra special."

    prompt = f"""{style_text} for a {pet.get('species', 'pet')} named {pet['name']}.
Breed: {pet.get('breed', 'Mixed')}
Age: {pet.get('age', 'Unknown')}
Gender: {pet.get('gender', 'Unknown')}
{tier_bonus}
Keep it to 2-3 paragraphs. Make it feel personal and unique."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"bio_{pet['pet_id']}_{used}",
            system_message="You are a creative pet biography writer for Petbookin, a social network for pets. Write engaging, heartfelt bios that make each pet feel special."
        )
        chat.with_model("openai", "gpt-5.2")

        user_message = UserMessage(text=prompt)
        bio = await chat.send_message(user_message)

        # Update usage count
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"ai_generations_used": 1}}
        )

        # Optionally save to pet
        await db.pets.update_one(
            {"pet_id": data.pet_id},
            {"$set": {"bio": bio}}
        )

        return {
            "bio": bio,
            "generations_used": used + 1,
            "generations_limit": limit,
            "tier": tier
        }

    except Exception as e:
        logger.error(f"AI generation failed: {e}")
        raise HTTPException(status_code=500, detail="AI generation failed. Please try again.")


@router.get("/limits")
async def get_ai_limits(request: Request):
    db = get_db(request)
    user = await get_current_user(request, db)
    tier = user.get("membership_tier", "free")
    return {
        "tier": tier,
        "used": user.get("ai_generations_used", 0),
        "limit": AI_LIMITS.get(tier, 0),
        "limits_by_tier": AI_LIMITS
    }
