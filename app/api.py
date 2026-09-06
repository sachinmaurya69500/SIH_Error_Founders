from datetime import date, timedelta
from typing import Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import ValidationError
from app.core.responses import error, success
from app.integrations import open_meteo, nasa_firms, cpcb, nasa_power, earth_engine
from app.integrations.health import provider_checks
from app.ai import gemini
from app.risk import flood_risk, fire_risk, pollution_risk, overall_risk
from app.schemas import FloodDetectRequest, AIBriefingRequest, FireAnalysisRequest

router = APIRouter()

INDIA_STATES = [{"name": "Andhra Pradesh", "latitude": 15.91, "longitude": 79.74}, {"name": "Arunachal Pradesh", "latitude": 28.22, "longitude": 94.72}, {"name": "Assam", "latitude": 26.20, "longitude": 92.94}, {"name": "Bihar", "latitude": 25.10, "longitude": 85.31}, {"name": "Chhattisgarh", "latitude": 21.28, "longitude": 81.86}, {"name": "Goa", "latitude": 15.30, "longitude": 74.12}, {"name": "Gujarat", "latitude": 22.26, "longitude": 71.19}, {"name": "Haryana", "latitude": 29.06, "longitude": 76.08}, {"name": "Himachal Pradesh", "latitude": 31.10, "longitude": 77.17}, {"name": "Jharkhand", "latitude": 23.61, "longitude": 85.28}, {"name": "Karnataka", "latitude": 15.32, "longitude": 75.71}, {"name": "Kerala", "latitude": 10.85, "longitude": 76.27}, {"name": "Madhya Pradesh", "latitude": 22.97, "longitude": 78.65}, {"name": "Maharashtra", "latitude": 19.75, "longitude": 75.71}, {"name": "Manipur", "latitude": 24.66, "longitude": 93.91}, {"name": "Meghalaya", "latitude": 25.46, "longitude": 91.36}, {"name": "Mizoram", "latitude": 23.16, "longitude": 92.94}, {"name": "Nagaland", "latitude": 26.16, "longitude": 94.56}, {"name": "Odisha", "latitude": 20.94, "longitude": 84.80}, {"name": "Punjab", "latitude": 31.15, "longitude": 75.34}, {"name": "Rajasthan", "latitude": 27.02, "longitude": 74.22}, {"name": "Sikkim", "latitude": 27.53, "longitude": 88.51}, {"name": "Tamil Nadu", "latitude": 11.12, "longitude": 78.65}, {"name": "Telangana", "latitude": 18.11, "longitude": 79.01}, {"name": "Tripura", "latitude": 23.94, "longitude": 91.99}, {"name": "Uttar Pradesh", "latitude": 26.85, "longitude": 80.91}, {"name": "Uttarakhand", "latitude": 30.06, "longitude": 79.02}, {"name": "West Bengal", "latitude": 22.99, "longitude": 87.85}, {"name": "Delhi", "latitude": 28.61, "longitude": 77.21}, {"name": "Jammu and Kashmir", "latitude": 33.78, "longitude": 76.58}, {"name": "Ladakh", "latitude": 34.15, "longitude": 77.58}, {"name": "Puducherry", "latitude": 11.94, "longitude": 79.81}]

def provider_error(exc: Exception):
    return error("UPSTREAM_API_ERROR", str(exc))

# Deliberately generous India envelope so border and island locations are usable.
INDIA_BOUNDS = {"min_latitude": 6.0, "max_latitude": 37.8, "min_longitude": 67.0, "max_longitude": 98.5}

def _coordinates(latitude: float, longitude: float) -> None:
    if not (INDIA_BOUNDS["min_latitude"] <= latitude <= INDIA_BOUNDS["max_latitude"] and INDIA_BOUNDS["min_longitude"] <= longitude <= INDIA_BOUNDS["max_longitude"]):
        raise HTTPException(422, detail=error("INDIA_ONLY", "Coordinates must fall within the supported India bounding box"))

def _geometry_coordinates(value: Any) -> list[tuple[float, float]]:
    if isinstance(value, list) and value and isinstance(value[0], (int, float)):
        return [(float(value[0]), float(value[1]))] if len(value) >= 2 else []
    if isinstance(value, list):
        result = []
        for child in value: result.extend(_geometry_coordinates(child))
        return result
    return []

def _india_geometry(geometry: dict[str, Any]) -> None:
    coordinates = _geometry_coordinates(geometry.get("coordinates"))
    if geometry.get("type") == "Feature": coordinates = _geometry_coordinates((geometry.get("geometry") or {}).get("coordinates"))
    if geometry.get("type") == "FeatureCollection":
        coordinates = [point for feature in geometry.get("features", []) for point in _geometry_coordinates(feature.get("geometry", {}).get("coordinates"))]
    if not coordinates or any(not (INDIA_BOUNDS["min_longitude"] <= lon <= INDIA_BOUNDS["max_longitude"] and INDIA_BOUNDS["min_latitude"] <= lat <= INDIA_BOUNDS["max_latitude"]) for lon, lat in coordinates):
        raise HTTPException(422, detail=error("INDIA_ONLY", "Flood geometry must fall within the supported India bounding box"))

@router.get("/health", tags=["system"], summary="Check API availability")
async def health():
    return success({"status": "ok", "environment": __import__("app.core.config", fromlist=["settings"]).settings.app_env}, "EcoShield")

@router.get("/health/providers", tags=["system"], summary="Run live provider connectivity checks without exposing secrets")
async def provider_health():
    from app.core.config import settings
    providers = {"Open-Meteo": {"configured": True, "status": "READY", "reason": "No API key is required."}}
    providers.update(await provider_checks())
    providers["PostgreSQL"] = {"configured": bool(settings.database_url), "status": "READY" if settings.database_url else "OPTIONAL", "reason": "Historical persistence is disabled until DATABASE_URL is set." if not settings.database_url else ""}
    return success(providers, "EcoShield provider diagnostics")

@router.post("/ai/briefing", tags=["ai"], summary="Generate a Gemini briefing from verified environmental observations")
async def ai_briefing(request: AIBriefingRequest):
    try:
        text = await gemini.environmental_briefing(request.model_dump())
        return success({"briefing": text, "generated": True, "model": __import__("app.core.config", fromlist=["settings"]).settings.gemini_model}, "Google Gemini")
    except Exception as exc: return provider_error(exc)

@router.post("/ai/ask", tags=["ai"], summary="Ask Gemini about the supplied verified environmental data")
async def ai_ask(question: str, request: AIBriefingRequest):
    if len(question.strip()) < 3: raise HTTPException(422, detail=error("VALIDATION_ERROR", "question must contain at least 3 characters"))
    try:
        text = await gemini.generate("Answer this question about India environmental conditions using only the verified context. If the context is insufficient, say so. Question: " + question + "\nContext: " + str(request.model_dump()))
        return success({"answer": text, "generated": True}, "Google Gemini")
    except Exception as exc: return provider_error(exc)

@router.get("/weather", tags=["weather"], summary="Get normalized current and forecast weather")
async def weather(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), timezone: str = "auto", forecast_days: int = Query(7, ge=1, le=16)):
    _coordinates(latitude, longitude)
    try:
        payload = await open_meteo.forecast(latitude, longitude, timezone, forecast_days)
        return success({"coordinates": {"latitude": latitude, "longitude": longitude}, "current": payload.get("current"), "hourly": payload.get("hourly"), "daily": payload.get("daily"), "units": {"current": payload.get("current_units"), "hourly": payload.get("hourly_units"), "daily": payload.get("daily_units")}}, "Open-Meteo")
    except Exception as exc: return provider_error(exc)

@router.get("/weather/states", tags=["weather"], summary="Get current weather and three-day forecasts for Indian states and territories")
async def state_weather():
    try: return success(await open_meteo.state_forecasts(INDIA_STATES), "Open-Meteo")
    except Exception as exc: return provider_error(exc)

@router.get("/rainfall", tags=["weather"], summary="Get rainfall observations and forecast")
async def rainfall(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), forecast_days: int = Query(7, ge=1, le=16)):
    _coordinates(latitude, longitude)
    try:
        payload = await open_meteo.forecast(latitude, longitude, forecast_days=forecast_days)
        hourly = payload.get("hourly") or {}
        values = hourly.get("precipitation") or []
        return success({"current_precipitation": (payload.get("current") or {}).get("precipitation"), "hourly": hourly, "daily": payload.get("daily"), "recent_totals": {"last_1_hour": values[-1] if values else None, "last_6_hours": sum(values[-6:]) if values else None, "last_24_hours": sum(values[-24:]) if values else None}, "forecast_total": sum((payload.get("daily") or {}).get("precipitation_sum") or [])}, "Open-Meteo")
    except Exception as exc: return provider_error(exc)

@router.get("/fire/hotspots", tags=["fire"], summary="Get NASA FIRMS fire hotspots")
async def fire_hotspots(area: str = "india", days: int = Query(1, ge=1, le=10), source: str = "VIIRS_SNPP_NRT"):
    try: return success(await nasa_firms.hotspots(area, days, source), "NASA FIRMS")
    except Exception as exc: return provider_error(exc)

@router.get("/fire/risk", tags=["risk"], summary="Calculate EcoShield fire risk")
async def fire_risk_endpoint(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), temperature: float | None = None, humidity: float | None = None, wind: float | None = None, precipitation: float | None = None, hotspots: int = Query(0, ge=0), confidence: float | None = None, frp: float | None = None):
    _coordinates(latitude, longitude)
    return success(fire_risk.score(temperature, humidity, wind, precipitation, hotspots, confidence, frp), "EcoShield risk engine")

@router.get("/pollution", tags=["pollution"], summary="Get CPCB/data.gov.in observations")
async def pollution(limit: int = Query(100, ge=1, le=1000)):
    try: return success(await cpcb.observations(limit), "data.gov.in CPCB")
    except Exception as exc: return provider_error(exc)

@router.get("/pollution/risk", tags=["risk"], summary="Calculate pollution risk")
async def pollution_risk_endpoint(aqi: float | None = None, pm2_5: float | None = None, pm10: float | None = None, no2: float | None = None, so2: float | None = None, o3: float | None = None, co: float | None = None):
    return success(pollution_risk.score(aqi, pm2_5, pm10, no2, so2, o3, co), "EcoShield risk engine")

@router.get("/flood/risk", tags=["risk"], summary="Calculate rainfall-based flood risk")
async def flood_risk_endpoint(rainfall_24h: float | None = None, rainfall_7d: float | None = None, forecast_rainfall: float | None = None, anomaly: float | None = None, observed_extent: float | None = None, elevation: float | None = None):
    return success(flood_risk.score(rainfall_24h, rainfall_7d, forecast_rainfall, anomaly, observed_extent, elevation), "EcoShield risk engine")

@router.post("/flood/detect", tags=["flood"], summary="Submit an asynchronous Sentinel-1 flood detection job")
async def flood_detect(request: FloodDetectRequest):
    if request.geometry.get("type") not in {"Polygon", "MultiPolygon", "Feature", "FeatureCollection"}:
        raise HTTPException(422, detail=error("VALIDATION_ERROR", "geometry must be valid GeoJSON Polygon, MultiPolygon, Feature, or FeatureCollection"))
    _india_geometry(request.geometry)
    try: return success(earth_engine.submit_flood_job(request), "Google Earth Engine / Sentinel-1")
    except Exception as exc: return provider_error(exc)

@router.get("/flood/tasks/{task_id}", tags=["flood"], summary="Poll an Earth Engine flood export task")
async def flood_task(task_id: str):
    try: return success(earth_engine.task_status(task_id), "Google Earth Engine")
    except Exception as exc: return provider_error(exc)

@router.post("/fire/earth-engine", tags=["fire"], summary="Analyze MODIS fire-mask and FRP pixels for an India AOI")
async def earth_engine_fire(request: FireAnalysisRequest):
    if request.geometry.get("type") not in {"Polygon", "MultiPolygon", "Feature", "FeatureCollection"}:
        raise HTTPException(422, detail=error("VALIDATION_ERROR", "geometry must be valid GeoJSON Polygon, MultiPolygon, Feature, or FeatureCollection"))
    _india_geometry(request.geometry)
    if request.end < request.start: raise HTTPException(422, detail=error("VALIDATION_ERROR", "end must be on or after start"))
    try: return success(earth_engine.fire_analysis(request), "Google Earth Engine / MODIS MOD14A1.061")
    except Exception as exc: return provider_error(exc)

@router.get("/risk", tags=["risk"], summary="Combine flood, fire, and pollution risk")
async def overall_risk_endpoint(flood: int = Query(0, ge=0, le=100), fire: int = Query(0, ge=0, le=100), pollution: int = Query(0, ge=0, le=100)):
    return success(overall_risk.score(flood, fire, pollution), "EcoShield risk engine")

@router.get("/alerts", tags=["alerts"], summary="Generate threshold-based alerts")
async def alerts(risk: int = Query(0, ge=0, le=100), type: str | None = None, severity: str | None = None, location: str | None = None):
    actual = "EXTREME" if risk >= 80 else "HIGH" if risk >= 60 else "MODERATE" if risk >= 31 else "LOW"
    result = [] if severity and severity.upper() != actual else ([{"type": type or "overall", "severity": actual, "location": location, "score": risk, "message": f"{actual} environmental risk detected"}] if risk >= 60 else [])
    return success(result, "EcoShield alert engine")

@router.get("/locations", tags=["locations"], summary="Return frontend-ready supported locations")
async def locations():
    return success([], "EcoShield")

@router.get("/historical", tags=["weather"], summary="Get NASA POWER historical climate data")
async def historical(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), start: date | None = None, end: date | None = None):
    _coordinates(latitude, longitude)
    end = end or date.today(); start = start or end - timedelta(days=30)
    if end < start: raise HTTPException(422, detail=error("VALIDATION_ERROR", "end must be on or after start"))
    try: return success(await nasa_power.historical(latitude, longitude, start, end), "NASA POWER")
    except Exception as exc: return provider_error(exc)
