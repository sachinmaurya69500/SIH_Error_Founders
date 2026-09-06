from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str | None = None
    nasa_firms_map_key: str | None = None
    data_gov_api_key: str | None = None
    gee_project_id: str | None = None
    gee_service_account_email: str | None = None
    gee_private_key: str | None = None
    gee_export_bucket: str | None = None
    gee_export_folder: str = "EcoShield"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    open_meteo_base_url: str = "https://api.open-meteo.com"
    nasa_power_base_url: str = "https://power.larc.nasa.gov/api"
    cors_origins_raw: str = Field(default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173", alias="CORS_ORIGINS")
    risk_flood_weight: float = 0.40
    risk_fire_weight: float = 0.30
    risk_pollution_weight: float = 0.30
    request_timeout_seconds: float = 15.0
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    @property
    def cors_origins(self) -> list[str]:
        return [x.strip() for x in self.cors_origins_raw.split(",") if x.strip()]

    @property
    def weights(self) -> dict[str, float]:
        raw = {"flood": self.risk_flood_weight, "fire": self.risk_fire_weight, "pollution": self.risk_pollution_weight}
        total = sum(raw.values())
        return {key: value / total for key, value in raw.items()} if total else {"flood": .4, "fire": .3, "pollution": .3}

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
