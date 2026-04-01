from fastapi import APIRouter, Request, Query
import logging
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/places", tags=["Places"])

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

PLACE_TYPES = {
    "vet": [
        '["amenity"="veterinary"]',
        '["healthcare"="veterinary"]',
        '["healthcare:speciality"="veterinary"]',
    ],
    "pet_store": [
        '["shop"="pet"]',
        '["shop"="pet;garden"]',
    ],
    "dog_park": [
        '["leisure"="dog_park"]',
        '["leisure"="park"]["dog"="yes"]',
    ],
    "groomer": [
        '["shop"="pet_grooming"]',
        '["craft"="pet_grooming"]',
        '["amenity"="animal_boarding"]',
    ],
    "park": [
        '["leisure"="park"]',
    ],
}


@router.get("/search")
async def search_places(
    request: Request,
    lat: float = Query(...),
    lng: float = Query(...),
    type: str = Query("vet"),
    radius: int = Query(10000),
):
    """Search for pet-friendly places near coordinates using OpenStreetMap"""
    if type not in PLACE_TYPES:
        type = "vet"

    tags = PLACE_TYPES[type]

    # Build multiple queries for broader results
    node_queries = ""
    for tag in tags:
        node_queries += f"node{tag}(around:{radius},{lat},{lng});\n"
        node_queries += f"way{tag}(around:{radius},{lat},{lng});\n"

    query = f"""
    [out:json][timeout:20];
    (
      {node_queries}
    );
    out center 50;
    """

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            resp.raise_for_status()
            data = resp.json()

        places = []
        for el in data.get("elements", []):
            tags = el.get("tags", {})
            lat_val = el.get("lat") or el.get("center", {}).get("lat")
            lng_val = el.get("lon") or el.get("center", {}).get("lon")
            if not lat_val or not lng_val:
                continue

            places.append({
                "name": tags.get("name", "Unnamed"),
                "lat": lat_val,
                "lng": lng_val,
                "type": type,
                "address": tags.get("addr:street", ""),
                "city": tags.get("addr:city", ""),
                "state": tags.get("addr:state", ""),
                "phone": tags.get("phone", ""),
                "website": tags.get("website", ""),
                "opening_hours": tags.get("opening_hours", ""),
            })

        return {"places": places, "total": len(places), "type": type}

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
