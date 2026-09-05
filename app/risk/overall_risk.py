from . import category, clamp
from app.core.config import settings

def score(flood: int, fire: int, pollution: int, weights: dict[str, float] | None = None) -> dict:
    weights = weights or settings.weights
    total = clamp(flood * weights["flood"] + fire * weights["fire"] + pollution * weights["pollution"])
    return {"overall_score": total, "category": category(total), "components": {"flood": flood, "fire": fire, "pollution": pollution}, "weights": weights}
