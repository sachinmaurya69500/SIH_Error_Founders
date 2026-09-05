from datetime import datetime, timezone
from typing import Any

def success(data: Any, source: str, *, cached: bool = False, **meta: Any) -> dict[str, Any]:
    return {"success": True, "data": data, "meta": {"source": source, "timestamp": datetime.now(timezone.utc).isoformat(), "cached": cached, **meta}}

def error(code: str, message: str) -> dict[str, Any]:
    return {"success": False, "error": {"code": code, "message": message}}
