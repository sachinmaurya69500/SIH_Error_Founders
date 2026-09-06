"""Live, low-cost checks for external providers."""

import asyncio
import httpx

from app.core.config import settings
from app.integrations import cpcb, earth_engine, nasa_firms


async def nasa_firms_check() -> dict:
    if not settings.nasa_firms_map_key:
        return {"configured": False, "status": "BLOCKED", "reason": "NASA_FIRMS_MAP_KEY is missing."}
    try:
        await nasa_firms.hotspots("india", 1)
        return {"configured": True, "status": "READY", "reason": "Live FIRMS request succeeded."}
    except Exception as exc:
        return {"configured": True, "status": "ERROR", "reason": f"Live FIRMS request failed: {exc}"}


async def cpcb_check() -> dict:
    if not settings.data_gov_api_key:
        return {"configured": False, "status": "BLOCKED", "reason": "DATA_GOV_API_KEY is missing."}
    try:
        await cpcb.observations(1)
        return {"configured": True, "status": "READY", "reason": "Live data.gov.in request succeeded."}
    except Exception as exc:
        return {"configured": True, "status": "ERROR", "reason": f"Live data.gov.in request failed: {exc}"}


async def gemini_check() -> dict:
    if not settings.gemini_api_key:
        return {"configured": False, "status": "BLOCKED", "reason": "GEMINI_API_KEY is missing."}
    # Listing models validates the key without consuming generation quota.
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(f"{settings.gemini_base_url.rstrip('/')}/models", headers={"x-goog-api-key": settings.gemini_api_key})
            response.raise_for_status()
        return {"configured": True, "status": "READY", "reason": "Live Gemini API request succeeded."}
    except Exception as exc:
        return {"configured": True, "status": "ERROR", "reason": f"Live Gemini API request failed: {exc}"}


async def earth_engine_check() -> dict:
    if not (settings.gee_project_id and settings.gee_service_account_email and settings.gee_private_key):
        return {"configured": False, "status": "BLOCKED", "reason": "GEE credentials are incomplete."}
    try:
        # Initialization plus a tiny server-side evaluation verifies credentials,
        # project access, and connectivity without starting an export.
        ee = await asyncio.to_thread(earth_engine._initialize)
        await asyncio.to_thread(lambda: ee.Number(1).getInfo())
        return {"configured": True, "status": "READY", "reason": "Live Earth Engine authentication check succeeded."}
    except Exception as exc:
        return {"configured": True, "status": "ERROR", "reason": f"Live Earth Engine check failed: {exc}"}


async def provider_checks() -> dict:
    results = await asyncio.gather(nasa_firms_check(), cpcb_check(), gemini_check(), earth_engine_check())
    return dict(zip(("NASA FIRMS", "CPCB/data.gov.in", "Google Gemini", "Google Earth Engine"), results))
