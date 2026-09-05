from . import category, clamp

def score(aqi=None, pm2_5=None, pm10=None, no2=None, so2=None, o3=None, co=None) -> dict:
    if aqi is not None: value = float(aqi) / 5.0
    else:
        candidates = []
        for reading, limit in ((pm2_5, 60), (pm10, 100), (no2, 80), (so2, 80), (o3, 100), (co, 4)):
            if reading is not None: candidates.append(float(reading) / limit * 100)
        value = max(candidates, default=0)
    final = clamp(value)
    return {"score": final, "category": category(final), "explanation": ["AQI is used when available; otherwise the highest available pollutant-to-guideline ratio is used."]}
