from datetime import date
from app.core.config import settings
from app.core.http import get_json

async def historical(latitude: float, longitude: float, start: date, end: date) -> dict:
    params = {"parameters": "T2M,PRECTOTCORR,RH2M,WS10M", "community": "AG", "longitude": longitude, "latitude": latitude, "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"), "format": "JSON"}
    return await get_json(f"{settings.nasa_power_base_url.rstrip('/')}/temporal/daily/point", params=params)
