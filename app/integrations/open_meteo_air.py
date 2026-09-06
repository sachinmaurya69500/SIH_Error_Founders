from app.core.http import get_json


async def current(latitude: float, longitude: float) -> list[dict]:
    payload = await get_json(
        "https://air-quality-api.open-meteo.com/v1/air-quality",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
            "timezone": "auto",
        },
    )
    values = payload.get("current") or {}
    if not values:
        raise RuntimeError("Open-Meteo returned no current air-quality data")
    return [{"station": "Current location", "city": "GPS location", "latitude": latitude, "longitude": longitude, "aqi": values.get("european_aqi"), "us_aqi": values.get("us_aqi"), "pm2_5": values.get("pm2_5"), "pm10": values.get("pm10"), "no2": values.get("nitrogen_dioxide"), "so2": values.get("sulphur_dioxide"), "co": values.get("carbon_monoxide"), "o3": values.get("ozone"), "timestamp": values.get("time"), "source": "Open-Meteo/CAMS model"}]
