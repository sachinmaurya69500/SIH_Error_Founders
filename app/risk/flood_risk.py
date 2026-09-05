from . import category, clamp

def score(rainfall_24h=None, rainfall_7d=None, forecast_rainfall=None, anomaly=None, observed_extent=None, elevation=None) -> dict:
    parts = []
    if rainfall_24h is not None: parts.append(min(float(rainfall_24h) / 150 * 35, 35))
    if rainfall_7d is not None: parts.append(min(float(rainfall_7d) / 400 * 25, 25))
    if forecast_rainfall is not None: parts.append(min(float(forecast_rainfall) / 150 * 20, 20))
    if anomaly is not None: parts.append(min(max(float(anomaly), 0) / 100 * 10, 10))
    if observed_extent is not None: parts.append(min(float(observed_extent) * 10, 10))
    value = clamp(sum(parts) if parts else 0)
    return {"score": value, "category": category(value), "explanation": ["Transparent rainfall and observed extent heuristic; not a certified flood forecast."]}
