from fastapi import APIRouter, Request, Query
from datetime import datetime, timezone, timedelta
import logging
import httpx
import hashlib

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/places", tags=["Places"])

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
CACHE_HOURS = 24

PLACE_TYPES = {
    "vet": [
        '["amenity"="veterinary"]',
        '["healthcare"="veterinary"]',
    ],
    "pet_store": [
        '["shop"="pet"]',
    ],
    "dog_park": [
        '["leisure"="dog_park"]',
        '["leisure"="park"]["dog"="yes"]',
    ],
    "groomer": [
        '["shop"="pet_grooming"]',
        '["craft"="pet_grooming"]',
    ],
    "park": [
        '["leisure"="park"]',
    ],
}


def make_cache_key(lat, lng, place_type, radius):
    rounded_lat = round(lat, 2)
    rounded_lng = round(lng, 2)
    raw = f"{rounded_lat}:{rounded_lng}:{place_type}:{radius}"
    return hashlib.md5(raw.encode()).hexdigest()


@router.get("/search")
async def search_places(
    request: Request,
    lat: float = Query(...),
    lng: float = Query(...),
    type: str = Query("vet"),
    radius: int = Query(15000),
):
    """Search for pet-friendly places near coordinates using OpenStreetMap"""
    db = request.app.state.db
    if type not in PLACE_TYPES:
        type = "vet"

    cache_key = make_cache_key(lat, lng, type, radius)

    # Check cache
    cached = await db.places_cache.find_one(
        {"cache_key": cache_key, "expires_at": {"$gt": datetime.now(timezone.utc)}},
        {"_id": 0}
    )
    if cached:
        return {"places": cached["places"], "total": len(cached["places"]), "type": type, "cached": True}

    type_tags = PLACE_TYPES[type]
    node_queries = ""
    for tag in type_tags:
        node_queries += f"node{tag}(around:{radius},{lat},{lng});\n"
        node_queries += f"way{tag}(around:{radius},{lat},{lng});\n"

    query = f"""
    [out:json][timeout:25];
    (
      {node_queries}
    );
    out center 50;
    """

    try:
        async with httpx.AsyncClient(timeout=25) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            resp.raise_for_status()
            data = resp.json()

        places = []
        for el in data.get("elements", []):
            el_tags = el.get("tags", {})
            lat_val = el.get("lat") or el.get("center", {}).get("lat")
            lng_val = el.get("lon") or el.get("center", {}).get("lon")
            if not lat_val or not lng_val:
                continue

            places.append({
                "name": el_tags.get("name", "Unnamed"),
                "lat": lat_val,
                "lng": lng_val,
                "type": type,
                "address": el_tags.get("addr:street", ""),
                "city": el_tags.get("addr:city", ""),
                "state": el_tags.get("addr:state", ""),
                "phone": el_tags.get("phone", ""),
                "website": el_tags.get("website", ""),
                "opening_hours": el_tags.get("opening_hours", ""),
            })

        # Cache results
        await db.places_cache.update_one(
            {"cache_key": cache_key},
            {"$set": {
                "cache_key": cache_key,
                "lat": lat, "lng": lng, "type": type, "radius": radius,
                "places": places,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=CACHE_HOURS),
            }},
            upsert=True
        )

        return {"places": places, "total": len(places), "type": type}

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            logger.warning("Overpass API rate limited (429)")
            return {"places": [], "total": 0, "type": type, "error": "Search is temporarily busy. Please try again in a minute."}
        logger.error(f"Places search failed: {e}")
        return {"places": [], "total": 0, "type": type, "error": "Search temporarily unavailable"}
    except Exception as e:
        logger.error(f"Places search failed: {e}")
        return {"places": [], "total": 0, "type": type, "error": "Search temporarily unavailable"}


@router.get("/geocode")
async def geocode(request: Request, q: str = Query(...)):
    """Geocode an address/city/zip to coordinates using Nominatim"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "json", "countrycodes": "us", "limit": 5},
                headers={"User-Agent": "Petbookin/1.0"}
            )
            resp.raise_for_status()
            results = resp.json()

        locations = []
        for r in results:
            locations.append({
                "lat": float(r["lat"]),
                "lng": float(r["lon"]),
                "display_name": r["display_name"],
            })

        return {"locations": locations}

    except Exception as e:
        logger.error(f"Geocode failed: {e}")
        return {"locations": [], "error": "Geocoding temporarily unavailable"}
