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
    return await generate("You are EcoShield, an India-focused environmental analyst. Use only the verified data below. Do not invent measurements, claim official warnings, or change the supplied risk scores. Write a concise briefing with: summary, key factors, practical precautions, and data limitations. Mention the source timestamps when present.\n\nVERIFIED DATA:\n" + json.dumps(context, ensure_ascii=False, default=str))
