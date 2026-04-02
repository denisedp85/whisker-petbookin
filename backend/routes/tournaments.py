from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone, timedelta
from utils.auth import get_current_user
import uuid
import logging

router = APIRouter(prefix="/tournaments", tags=["Tournaments"])
logger = logging.getLogger(__name__)

TOURNAMENT_TYPES = {
    "breed_show": {"name": "Breed Show", "description": "Show off your best breed photos!", "icon": "camera", "entry_type": "photo"},
    "pet_show": {"name": "Pet Show", "description": "Cutest pet, best trick, most photogenic!", "icon": "heart", "entry_type": "photo"},
    "breed_quiz": {"name": "Breed Quiz Battle", "description": "Test your breed knowledge — highest score wins!", "icon": "brain", "entry_type": "score"},
}

WINNER_POINTS = {1: 500, 2: 250, 3: 100}


def generate_tournament_id():
    return f"trn_{uuid.uuid4().hex[:12]}"


def generate_entry_id():
    return f"ent_{uuid.uuid4().hex[:12]}"


async def auto_finalize_tournaments(db):
    """Check for ended tournaments and finalize them."""
    now = datetime.now(timezone.utc)
    ended = await db.tournaments.find(
        {"status": "active", "end_date": {"$lte": now}},
        {"_id": 0}
    ).to_list(50)

    for tournament in ended:
        tid = tournament["tournament_id"]
        # Get entries sorted by votes
        entries = await db.tournament_entries.find(
            {"tournament_id": tid},
            {"_id": 0}
        ).sort("votes_count", -1).to_list(100)

        winners = []
        for rank, entry in enumerate(entries[:3], 1):
            points = WINNER_POINTS.get(rank, 0)
            winners.append({
                "rank": rank,
                "user_id": entry["user_id"],
                "user_name": entry["user_name"],
                "entry_id": entry["entry_id"],
                "votes": entry.get("votes_count", 0),
                "points_awarded": points,
            })

            # Award points to winner
            await db.users.update_one(
                {"user_id": entry["user_id"]},
                {"$inc": {"points": points}}
            )

            # Add champion badge
            badge = {
                "badge_id": f"champ_{tid}_{rank}",
                "type": "tournament_champion",
                "rank": rank,
                "tournament_id": tid,
                "tournament_name": tournament["title"],
                "awarded_at": now.isoformat(),
            }
            await db.users.update_one(
                {"user_id": entry["user_id"]},
                {"$push": {"badges": badge}}
            )

            # 1st place gets 1-week tier upgrade
            if rank == 1:
                user = await db.users.find_one({"user_id": entry["user_id"]}, {"_id": 0})
                if user:
                    current_tier = user.get("membership_tier", "free")
                    tier_order = ["free", "prime", "pro", "ultra", "mega"]
                    current_idx = tier_order.index(current_tier) if current_tier in tier_order else 0
                    if current_idx < len(tier_order) - 1:
                        upgrade_tier = tier_order[current_idx + 1]
                        await db.users.update_one(
                            {"user_id": entry["user_id"]},
                            {"$set": {
                                "tournament_tier_upgrade": {
                                    "original_tier": current_tier,
                                    "upgraded_tier": upgrade_tier,
                                    "expires_at": (now + timedelta(days=7)).isoformat(),
                                    "tournament_id": tid,
                                },
                                "membership_tier": upgrade_tier,
                            }}
                        )

            # Send notification
            await db.notifications.insert_one({
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": entry["user_id"],
                "type": "tournament_win",
                "title": f"{'1st' if rank == 1 else '2nd' if rank == 2 else '3rd'} Place in {tournament['title']}!",
                "message": f"You earned {points} points" + (" and a 1-week tier upgrade!" if rank == 1 else "!"),
                "read": False,
                "created_at": now,
            })

        await db.tournaments.update_one(
            {"tournament_id": tid},
            {"$set": {"status": "completed", "winners": winners, "completed_at": now}}
        )
        logger.info(f"Tournament {tid} finalized with {len(winners)} winners")


async def ensure_seed_tournaments(db):
    """Seed some tournaments if none exist."""
    count = await db.tournaments.count_documents({})
    if count > 0:
        return

    now = datetime.now(timezone.utc)
    seeds = [
        {
            "tournament_id": generate_tournament_id(),
            "title": "Cutest Pet Photo Contest",
            "description": "Submit your cutest pet photo and let the community vote!",
            "tournament_type": "pet_show",
            "category": "Cutest Pet",
            "status": "active",
            "start_date": now,
            "end_date": now + timedelta(days=3),
            "entry_count": 0,
            "winners": [],
            "created_by": "system",
            "created_at": now,
        },
        {
            "tournament_id": generate_tournament_id(),
            "title": "Best Breed Showcase",
            "description": "Show off your purebred's best angle! AKC-style judging by votes.",
            "tournament_type": "breed_show",
            "category": "Best in Show",
            "status": "active",
            "start_date": now,
            "end_date": now + timedelta(days=3),
            "entry_count": 0,
            "winners": [],
            "created_by": "system",
            "created_at": now,
        },
        {
            "tournament_id": generate_tournament_id(),
            "title": "Breed Quiz Championship",
            "description": "Who knows the most about dog & cat breeds? Top quiz score wins!",
            "tournament_type": "breed_quiz",
            "category": "Trivia",
            "status": "active",
            "start_date": now,
            "end_date": now + timedelta(days=3),
            "entry_count": 0,
            "winners": [],
            "created_by": "system",
            "created_at": now,
        },
    ]
    await db.tournaments.insert_many(seeds)
    logger.info("Seeded 3 initial tournaments")


# ─── ENDPOINTS ───

@router.get("/active")
async def get_active_tournaments(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    # Auto-finalize any expired
    await auto_finalize_tournaments(db)
    # Seed if empty
    await ensure_seed_tournaments(db)

    tournaments = await db.tournaments.find(
        {"status": "active"},
        {"_id": 0}
    ).sort("end_date", 1).to_list(20)

    # For each tournament, check if user already entered
    for t in tournaments:
        entry = await db.tournament_entries.find_one(
            {"tournament_id": t["tournament_id"], "user_id": user["user_id"]},
            {"_id": 0}
        )
        t["user_entered"] = bool(entry)
        t["user_entry"] = entry

    return {"tournaments": tournaments}


@router.get("/past")
async def get_past_tournaments(request: Request):
    db = request.app.state.db
    await get_current_user(request, db)

    tournaments = await db.tournaments.find(
        {"status": "completed"},
        {"_id": 0}
    ).sort("completed_at", -1).limit(20).to_list(20)

    return {"tournaments": tournaments}


@router.get("/hall-of-fame")
async def get_hall_of_fame(request: Request):
    db = request.app.state.db
    await get_current_user(request, db)

    # Get all tournament winners (rank 1)
    completed = await db.tournaments.find(
        {"status": "completed", "winners.0": {"$exists": True}},
        {"_id": 0}
    ).sort("completed_at", -1).limit(50).to_list(50)

    champions = []
    for t in completed:
        for w in t.get("winners", []):
            if w["rank"] == 1:
                user = await db.users.find_one(
                    {"user_id": w["user_id"]},
                    {"_id": 0, "password_hash": 0}
                )
                champions.append({
                    "tournament_name": t["title"],
                    "tournament_type": t.get("tournament_type", ""),
                    "category": t.get("category", ""),
                    "completed_at": t.get("completed_at", ""),
                    "winner_name": w["user_name"],
                    "winner_id": w["user_id"],
                    "winner_picture": user.get("picture", "") if user else "",
                    "winner_tier": user.get("membership_tier", "free") if user else "free",
                    "votes": w.get("votes", 0),
                    "points_awarded": w.get("points_awarded", 0),
                })

    return {"champions": champions}


@router.get("/{tournament_id}/entries")
async def get_tournament_entries(tournament_id: str, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    entries = await db.tournament_entries.find(
        {"tournament_id": tournament_id},
        {"_id": 0}
    ).sort("votes_count", -1).to_list(100)

    # Check which entries the user has voted for
    for entry in entries:
        entry["user_voted"] = user["user_id"] in entry.get("voters", [])

    return {"entries": entries}


@router.post("/enter")
async def enter_tournament(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)
    body = await request.json()

    tournament_id = body.get("tournament_id")
    title = body.get("title", "").strip()
    description = body.get("description", "").strip()
    media_url = body.get("media_url", "")
    pet_id = body.get("pet_id", "")
    quiz_score = body.get("quiz_score")

    if not tournament_id:
        raise HTTPException(status_code=400, detail="Tournament ID required")

    tournament = await db.tournaments.find_one(
        {"tournament_id": tournament_id, "status": "active"},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found or not active")

    # Check if already entered
    existing = await db.tournament_entries.find_one(
        {"tournament_id": tournament_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already entered this tournament")

    if not title and tournament.get("tournament_type") != "breed_quiz":
        raise HTTPException(status_code=400, detail="Entry title is required")

    now = datetime.now(timezone.utc)
    pet_name = ""
    if pet_id:
        pet = await db.pets.find_one({"pet_id": pet_id}, {"_id": 0})
        if pet:
            pet_name = pet["name"]

    entry = {
        "entry_id": generate_entry_id(),
        "tournament_id": tournament_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", "User"),
        "user_picture": user.get("picture", ""),
        "title": title or f"Quiz Score: {quiz_score}",
        "description": description,
        "media_url": media_url,
        "pet_id": pet_id,
        "pet_name": pet_name,
        "quiz_score": quiz_score,
        "votes_count": 0,
        "voters": [],
        "created_at": now,
    }

    await db.tournament_entries.insert_one(entry)
    await db.tournaments.update_one(
        {"tournament_id": tournament_id},
        {"$inc": {"entry_count": 1}}
    )

    entry.pop("_id", None)
    return entry


@router.post("/{tournament_id}/vote/{entry_id}")
async def vote_entry(tournament_id: str, entry_id: str, request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    tournament = await db.tournaments.find_one(
        {"tournament_id": tournament_id, "status": "active"},
        {"_id": 0}
    )
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found or not active")

    entry = await db.tournament_entries.find_one(
        {"entry_id": entry_id, "tournament_id": tournament_id},
        {"_id": 0}
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    # Can't vote for own entry
    if entry["user_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="You can't vote for your own entry")

    # Toggle vote
    if user["user_id"] in entry.get("voters", []):
        await db.tournament_entries.update_one(
            {"entry_id": entry_id},
            {"$pull": {"voters": user["user_id"]}, "$inc": {"votes_count": -1}}
        )
        return {"voted": False, "votes_count": entry.get("votes_count", 1) - 1}
    else:
        await db.tournament_entries.update_one(
            {"entry_id": entry_id},
            {"$push": {"voters": user["user_id"]}, "$inc": {"votes_count": 1}}
        )
        return {"voted": True, "votes_count": entry.get("votes_count", 0) + 1}


@router.get("/top-contributor")
async def get_top_contributor(request: Request):
    db = request.app.state.db
    await get_current_user(request, db)

    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    # Check cached result
    cached = await db.weekly_top_contributors.find_one(
        {"week_start": week_start.isoformat()},
        {"_id": 0}
    )
    if cached and (now - datetime.fromisoformat(cached.get("computed_at", now.isoformat()))).seconds < 3600:
        return cached

    # Calculate: sum of points earned this week from various activities
    # 1. Game sessions points
    game_points = await db.game_sessions.aggregate([
        {"$match": {"created_at": {"$gte": week_start}, "status": "completed"}},
        {"$group": {"_id": "$user_id", "total": {"$sum": "$points_earned"}}},
    ]).to_list(1000)

    # 2. Daily check-in points
    checkin_points = await db.daily_checkins.aggregate([
        {"$match": {"created_at": {"$gte": week_start}}},
        {"$group": {"_id": "$user_id", "total": {"$sum": "$points_earned"}}},
    ]).to_list(1000)

    # 3. Posts created (5 pts each)
    post_counts = await db.posts.aggregate([
        {"$match": {"created_at": {"$gte": week_start}}},
        {"$group": {"_id": "$author_id", "count": {"$sum": 1}}},
    ]).to_list(1000)

    # 4. Likes received (2 pts each)
    liked_posts = await db.posts.aggregate([
        {"$match": {"created_at": {"$gte": week_start}, "likes_count": {"$gt": 0}}},
        {"$group": {"_id": "$author_id", "total_likes": {"$sum": "$likes_count"}}},
    ]).to_list(1000)

    # Combine all scores
    scores = {}
    for item in game_points:
        uid = item["_id"]
        scores[uid] = scores.get(uid, 0) + item["total"]
    for item in checkin_points:
        uid = item["_id"]
        scores[uid] = scores.get(uid, 0) + item["total"]
    for item in post_counts:
        uid = item["_id"]
        scores[uid] = scores.get(uid, 0) + (item["count"] * 5)
    for item in liked_posts:
        uid = item["_id"]
        scores[uid] = scores.get(uid, 0) + (item["total_likes"] * 2)

    if not scores:
        return {"top_contributor": None, "week_start": week_start.isoformat()}

    # Sort and get top
    sorted_users = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_list = []
    for uid, score in sorted_users[:10]:
        user = await db.users.find_one(
            {"user_id": uid},
            {"_id": 0, "password_hash": 0}
        )
        if user:
            top_list.append({
                "user_id": uid,
                "name": user.get("name", "User"),
                "picture": user.get("picture", ""),
                "membership_tier": user.get("membership_tier", "free"),
                "weekly_score": score,
                "badges": [b for b in user.get("badges", []) if b.get("type") == "tournament_champion"],
            })

    result = {
        "top_contributor": top_list[0] if top_list else None,
        "top_10": top_list,
        "week_start": week_start.isoformat(),
        "computed_at": now.isoformat(),
    }

    # Cache it
    await db.weekly_top_contributors.update_one(
        {"week_start": week_start.isoformat()},
        {"$set": result},
        upsert=True
    )

    return result


# ─── ADMIN: Create Tournament ───
@router.post("/admin/create")
async def admin_create_tournament(request: Request):
    db = request.app.state.db
    user = await get_current_user(request, db)

    if not user.get("is_admin") and user.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Admin only")

    body = await request.json()
    title = body.get("title", "").strip()
    description = body.get("description", "").strip()
    tournament_type = body.get("tournament_type", "pet_show")
    category = body.get("category", "General")
    duration_days = int(body.get("duration_days", 3))

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    now = datetime.now(timezone.utc)
    tournament = {
        "tournament_id": generate_tournament_id(),
        "title": title,
        "description": description,
        "tournament_type": tournament_type,
        "category": category,
        "status": "active",
        "start_date": now,
        "end_date": now + timedelta(days=duration_days),
        "entry_count": 0,
        "winners": [],
        "created_by": user["user_id"],
        "created_at": now,
    }

    await db.tournaments.insert_one(tournament)
    tournament.pop("_id", None)
    return tournament
