"""EcoShield API entrypoint."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router
from app.core.config import settings

app = FastAPI(title="EcoShield Environmental Risk Intelligence API", version="0.1.0", description="Environmental observations, risk scores, alerts, and flood jobs.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])
app.include_router(router, prefix="/api")
