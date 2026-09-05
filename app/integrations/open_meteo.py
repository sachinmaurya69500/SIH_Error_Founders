from datetime import date
from app.core.config import settings
from app.core.http import get_json, get_payload

CURRENT = "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,weather_code"
HOURLY = "temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,weather_code"
DAILY = "temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,wind_speed_10m_max,weather_code"

async def forecast(latitude: float, longitude: float, timezone: str = "auto", forecast_days: int = 7, start_date: date | None = None, end_date: date | None = None) -> dict:
    params = {"latitude": latitude, "longitude": longitude, "timezone": timezone, "current": CURRENT, "hourly": HOURLY, "daily": DAILY, "forecast_days": min(max(forecast_days, 1), 16)}
    if start_date: params.update(start_date=start_date.isoformat(), end_date=(end_date or start_date).isoformat())
    return await get_json(f"{settings.open_meteo_base_url.rstrip('/')}/v1/forecast", params=params)

async def state_forecasts(locations: list[dict]) -> list[dict]:
    params = {"latitude": ",".join(str(x["latitude"]) for x in locations), "longitude": ",".join(str(x["longitude"]) for x in locations), "timezone": "Asia/Kolkata", "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code", "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code", "forecast_days": 3}
    payload = await get_payload(f"{settings.open_meteo_base_url.rstrip('/')}/v1/forecast", params=params)
    if isinstance(payload, dict): payload = [payload]
    return [{"name": location["name"], "latitude": location["latitude"], "longitude": location["longitude"], "current": item.get("current"), "daily": item.get("daily")} for location, item in zip(locations, payload or [])]
