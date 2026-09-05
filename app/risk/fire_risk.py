from . import category, clamp

def score(temperature=None, humidity=None, wind=None, precipitation=None, hotspots=0, confidence=None, frp=None) -> dict:
    value = 0
    if temperature is not None: value += max(0, min(25, (float(temperature) - 25) * 1.7))
    if humidity is not None: value += max(0, min(25, (70 - float(humidity)) * .5))
    if wind is not None: value += min(20, float(wind) / 3)
    if precipitation is not None: value += max(0, 15 - float(precipitation) * 3)
    value += min(15, float(hotspots) * 2)
    value += min(10, (float(frp) / 20 if frp is not None else 0))
    final = clamp(value)
    return {"score": final, "category": category(final), "explanation": ["EcoShield Fire Risk Score; not an official fire danger index."]}
