import httpx
from app.core.config import settings

async def get_json(url: str, *, params: dict | None = None, headers: dict | None = None) -> dict:
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()
            return payload if isinstance(payload, dict) else {}
    except httpx.TimeoutException as exc:
        raise RuntimeError("Upstream request timed out") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise RuntimeError("Upstream provider returned an invalid response") from exc

async def get_payload(url: str, *, params: dict | None = None, headers: dict | None = None):
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException as exc:
        raise RuntimeError("Upstream request timed out") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise RuntimeError("Upstream provider returned an invalid response") from exc
