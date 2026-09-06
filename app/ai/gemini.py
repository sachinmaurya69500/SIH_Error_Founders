import json
import httpx
from app.core.config import settings

async def generate(prompt: str) -> str:
    if not settings.gemini_api_key:
        raise RuntimeError("Gemini is not configured; set GEMINI_API_KEY")
    url = f"{settings.gemini_base_url.rstrip('/')}/models/{settings.gemini_model}:generateContent"
    body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2, "maxOutputTokens": 700}}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, headers={"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"}, json=body)
            response.raise_for_status()
            payload = response.json()
        return payload["candidates"][0]["content"]["parts"][0]["text"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise RuntimeError("Gemini returned an invalid response") from exc

async def environmental_briefing(context: dict) -> str:
    return await generate("""You are EcoShield, an India-focused environmental analyst. Use only the verified data below.
The location object is the user's current GPS location; make clear that weather and local conditions refer to it.
Summarize current weather, rainfall, air quality, active fire hotspots, risk scores, and practical precautions.
For active flooded areas, report only locations explicitly present in verified flood observations or a completed Earth Engine result.
If no verified active flood-area data is supplied, say exactly that it is unavailable and distinguish rainfall-based flood risk from confirmed flooding.
Never invent measurements, locations, timestamps, official warnings, or change supplied risk scores. Mention source timestamps and data limitations.
Keep the response concise with headings: Current conditions, Flood status, Other signals, Precautions, Limitations.

VERIFIED DATA:
""" + json.dumps(context, ensure_ascii=False, default=str))
