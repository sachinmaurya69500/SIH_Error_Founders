def category(score: float) -> str:
    if score >= 81: return "EXTREME"
    if score >= 61: return "HIGH"
    if score >= 31: return "MODERATE"
    return "LOW"

def clamp(value: float) -> int:
    return max(0, min(100, round(value)))
