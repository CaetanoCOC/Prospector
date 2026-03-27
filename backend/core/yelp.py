import os
import requests
from typing import Optional

YELP_BASE = "https://api.yelp.com/v3"


def _headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}"}


def search_businesses(
    api_key: str,
    term: str,
    location: str,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Search Yelp businesses. Returns list of business dicts."""
    url = f"{YELP_BASE}/businesses/search"
    params = {
        "term": term,
        "location": location,
        "limit": min(limit, 50),
        "offset": offset,
    }
    resp = requests.get(url, headers=_headers(api_key), params=params, timeout=10)
    resp.raise_for_status()
    return resp.json().get("businesses", [])


def get_business_detail(api_key: str, yelp_id: str) -> Optional[dict]:
    """Get full business detail including website."""
    url = f"{YELP_BASE}/businesses/{yelp_id}"
    try:
        resp = requests.get(url, headers=_headers(api_key), timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None


def fetch_leads(api_key: str, term: str, location: str, total: int) -> list[dict]:
    """
    Fetch up to `total` businesses from Yelp, with pagination.
    Each result is enriched with website from detail endpoint.
    Returns list of normalized lead dicts ready for DB insertion.
    """
    results = []
    offset = 0
    per_page = 50

    while len(results) < total:
        batch_size = min(per_page, total - len(results))
        businesses = search_businesses(api_key, term, location, batch_size, offset)
        if not businesses:
            break

        for biz in businesses:
            if len(results) >= total:
                break

            detail = get_business_detail(api_key, biz["id"])
            website = None
            if detail:
                website = detail.get("website") or detail.get("url")

            loc = biz.get("location", {})
            lead = {
                "yelp_id": biz.get("id"),
                "name": biz.get("name", ""),
                "phone": biz.get("phone", ""),
                "website": website,
                "address": loc.get("address1", ""),
                "city": loc.get("city", ""),
                "state": loc.get("state", ""),
                "zip": loc.get("zip_code", ""),
                "rating": biz.get("rating"),
                "review_count": biz.get("review_count"),
                "niche": term.lower(),
            }
            results.append(lead)

        offset += per_page
        if len(businesses) < per_page:
            break

    return results


def validate_api_key(api_key: str) -> bool:
    """Check if API key is valid by doing a minimal search."""
    try:
        businesses = search_businesses(api_key, "coffee", "New York, NY", limit=1)
        return True
    except Exception:
        return False
