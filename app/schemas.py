from datetime import date
from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator

class FloodDetectRequest(BaseModel):
    geometry: dict[str, Any]
    before_start: date
    before_end: date
    after_start: date
    after_end: date
    polarization: Literal["VV", "VH"] = "VV"
    threshold: float = Field(default=1.25, gt=0)

    @field_validator("before_end")
    @classmethod
    def before_order(cls, value, info):
        start = info.data.get("before_start")
        if start and value < start: raise ValueError("before_end must be on or after before_start")
        return value

    @field_validator("after_end")
    @classmethod
    def after_order(cls, value, info):
        start = info.data.get("after_start")
        if start and value < start: raise ValueError("after_end must be on or after after_start")
        return value

class AIBriefingRequest(BaseModel):
    location: str | dict = "India"
    weather: dict = {}
    rainfall: dict = {}
    fire: dict = {}
    pollution: dict = {}
    risk: dict = {}

class FireAnalysisRequest(BaseModel):
    geometry: dict[str, Any]
    start: date
    end: date
    min_confidence: Literal["low", "nominal", "high"] = "nominal"
