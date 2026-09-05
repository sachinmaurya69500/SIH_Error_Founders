from app.core.config import settings

async def hotspots(area: str = "world", days: int = 1, source: str = "VIIRS_SNPP_NRT") -> list[dict]:
    if not settings.nasa_firms_map_key: raise RuntimeError("NASA FIRMS is not configured")
    import csv, io, httpx
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{settings.nasa_firms_map_key}/{source}/{area}/{min(max(days, 1), 10)}"
    async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
        response = await client.get(url)
        response.raise_for_status()
    rows = list(csv.DictReader(io.StringIO(response.text)))
    return [{"latitude": _num(row.get("latitude")), "longitude": _num(row.get("longitude")), "timestamp": row.get("acq_date") and f"{row['acq_date']}T{row.get('acq_time', '0000')[:2]}:{row.get('acq_time', '0000')[2:]}:00Z", "acquisition_date": row.get("acq_date"), "satellite": row.get("satellite"), "instrument": row.get("instrument"), "confidence": _num(row.get("confidence")), "frp": _num(row.get("frp")), "source": source} for row in rows]

def _num(value):
    try: return float(value) if value not in (None, "") else None
    except (TypeError, ValueError): return None
