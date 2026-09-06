from app.core.config import settings
from app.core.http import get_json

async def observations(limit: int = 100) -> list[dict]:
    if not settings.data_gov_api_key: raise RuntimeError("CPCB data.gov.in is not configured")
    payload = await get_json(
        f"https://api.data.gov.in/resource/{settings.data_gov_resource_id}",
        params={"api-key": settings.data_gov_api_key, "format": "json", "offset": 0, "limit": min(limit, 1000)},
    )
    records = payload.get("records", [])
    def value(row, *names):
        for name in names:
            if row.get(name) not in (None, "", "NA", "na"): return row.get(name)
        return None
    return [{"station": value(r, "station", "station_name"), "city": value(r, "city"), "state": value(r, "state"), "latitude": value(r, "latitude", "lat"), "longitude": value(r, "longitude", "long", "lon"), "aqi": value(r, "aqi", "AQI"), "pm2_5": value(r, "pm2_5", "pm25", "PM2.5"), "pm10": value(r, "pm10", "PM10"), "no2": value(r, "no2", "NO2"), "so2": value(r, "so2", "SO2"), "co": value(r, "co", "CO"), "o3": value(r, "o3", "O3"), "timestamp": value(r, "last_update", "timestamp")} for r in records]
