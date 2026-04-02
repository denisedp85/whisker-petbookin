from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from utils.auth import get_current_user
import uuid
import random
import logging

router = APIRouter(prefix="/games", tags=["Games"])
logger = logging.getLogger(__name__)

GAMES = [
    {"game_id": "breed_quiz", "name": "Breed Quiz", "description": "Test your knowledge of dog, cat, and exotic breeds!", "icon": "brain", "points_per_win": 10, "category": "trivia"},
    {"game_id": "treat_catcher", "name": "Treat Catcher", "description": "Catch falling treats before they hit the ground!", "icon": "target", "points_per_win": 15, "category": "arcade"},
    {"game_id": "pet_puzzle", "name": "Pet Puzzle", "description": "Solve adorable pet puzzles as fast as you can!", "icon": "puzzle", "points_per_win": 20, "category": "puzzle"},
    {"game_id": "pet_show", "name": "Pet Show Champion", "description": "Score pets in the ultimate pet show competition!", "icon": "trophy", "points_per_win": 25, "category": "competition"},
]

BREED_QUIZ_QUESTIONS = [
    {"question": "Which breed is known as the 'Apollo of dogs'?", "options": ["Labrador", "Great Dane", "Doberman", "Rottweiler"], "answer": 1},
    {"question": "What breed was originally bred to hunt badgers?", "options": ["Beagle", "Basset Hound", "Dachshund", "Jack Russell"], "answer": 2},
    {"question": "Which cat breed is known for its folded ears?", "options": ["Siamese", "Scottish Fold", "Maine Coon", "Persian"], "answer": 1},
    {"question": "Which dog breed is the smallest recognized by the AKC?", "options": ["Chihuahua", "Pomeranian", "Yorkshire Terrier", "Toy Poodle"], "answer": 0},
    {"question": "Which breed is known as the 'King of Terriers'?", "options": ["Bull Terrier", "Fox Terrier", "Airedale Terrier", "Cairn Terrier"], "answer": 2},
    {"question": "What cat breed is the largest domesticated?", "options": ["Ragdoll", "Bengal", "Maine Coon", "Savannah"], "answer": 2},
    {"question": "Which dog breed has a blue-black tongue?", "options": ["Shar Pei", "Chow Chow", "Akita", "Shiba Inu"], "answer": 1},
    {"question": "Which breed is often called 'Velcro dog' for their attachment?", "options": ["Vizsla", "Labrador", "Golden Retriever", "Poodle"], "answer": 0},
]


@router.get("/available")
async def get_available_games(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    return {"games": GAMES, "user_points": user.get("points", 0)}


@router.get("/leaderboard")
async def get_leaderboard(request: Request):
    db = request.app.state.db
    await get_current_user(request, db)

    top_players = await db.users.find(
        {"points": {"$gt": 0}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "points": 1, "membership_tier": 1}
    ).sort("points", -1).limit(20).to_list(20)

    return {"leaderboard": top_players}


@router.post("/breed-quiz/start")
async def start_breed_quiz(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    questions = random.sample(BREED_QUIZ_QUESTIONS, min(5, len(BREED_QUIZ_QUESTIONS)))
    session_id = f"quiz_{uuid.uuid4().hex[:12]}"

    now = datetime.now(timezone.utc)
    await db.game_sessions.insert_one({
        "session_id": session_id,
        "game_id": "breed_quiz",
        "user_id": user["user_id"],
        "questions": questions,
        "answers": [],
        "score": 0,
        "status": "active",
        "created_at": now,
    })

    safe_questions = [{"question": q["question"], "options": q["options"]} for q in questions]
    return {"session_id": session_id, "questions": safe_questions, "total": len(safe_questions)}


@router.post("/breed-quiz/submit")
async def submit_breed_quiz(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    body = await request.json()

    session_id = body.get("session_id")
    answers = body.get("answers", [])

    session = await db.game_sessions.find_one(
        {"session_id": session_id, "user_id": user["user_id"], "status": "active"},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")

    correct = 0
    results = []
    for i, q in enumerate(session["questions"]):
        user_answer = answers[i] if i < len(answers) else -1
        is_correct = user_answer == q["answer"]
        if is_correct:
            correct += 1
        results.append({
            "question": q["question"],
            "correct_answer": q["answer"],
            "user_answer": user_answer,
            "is_correct": is_correct,
        })

    points_earned = correct * 10
    now = datetime.now(timezone.utc)

    await db.game_sessions.update_one(
        {"session_id": session_id},
        {"$set": {"status": "completed", "score": correct, "answers": answers, "points_earned": points_earned, "completed_at": now}}
    )

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"points": points_earned}}
    )

    return {
        "score": correct,
        "total": len(session["questions"]),
        "points_earned": points_earned,
        "results": results,
    }


@router.get("/daily-checkin")
async def get_checkin_status(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    checkin = await db.daily_checkins.find_one(
        {"user_id": user["user_id"], "date": today}, {"_id": 0}
    )

    streak = user.get("checkin_streak", 0)
    return {"checked_in_today": bool(checkin), "streak": streak, "points": user.get("points", 0)}


@router.post("/daily-checkin")
async def daily_checkin(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.daily_checkins.find_one(
        {"user_id": user["user_id"], "date": today}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")

    streak = user.get("checkin_streak", 0) + 1
    bonus = min(streak * 5, 50)  # 5 pts per day, max 50

    now = datetime.now(timezone.utc)
    await db.daily_checkins.insert_one({
        "user_id": user["user_id"],
        "date": today,
        "streak": streak,
        "points_earned": bonus,
        "created_at": now,
    })

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"points": bonus}, "$set": {"checkin_streak": streak, "updated_at": now}}
    )

    return {"streak": streak, "points_earned": bonus, "message": f"Day {streak} streak! +{bonus} points"}
