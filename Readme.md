# EcoShield backend

EcoShield is a Vercel-compatible FastAPI backend for India-focused environmental observations and explainable environmental risk scores. It contains no frontend and no persistent worker process. Location APIs and flood AOIs are restricted to the approximate India bounding box: 6.5–37.5°N, 68–97.5°E.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Interactive OpenAPI documentation is available at `http://localhost:8000/docs` and `/redoc`. Run tests with `pytest`.

## API

All responses use `{success, data, meta}` on success and `{success, error}` on handled errors.

`GET /api/health`

`GET /api/weather?latitude=28.61&longitude=77.21&forecast_days=7` (India only)

`GET /api/rainfall?latitude=28.61&longitude=77.21` (India only)

`GET /api/fire/hotspots?area=india&days=1`

`GET /api/fire/risk?temperature=38&humidity=25&wind=20&hotspots=3`

`GET /api/pollution` and `GET /api/pollution/risk?aqi=180`

`GET /api/flood/risk?rainfall_24h=120&forecast_rainfall=80`

`POST /api/flood/detect` with a GeoJSON Polygon or MultiPolygon and before/after date windows. When configured, this submits a Sentinel-1 GRD change-detection task to Earth Engine and returns its task ID.

`GET /api/risk?flood=78&fire=41&pollution=63`

`GET /api/alerts?risk=80&type=flood&location=Delhi`

`GET /api/locations`

`GET /api/historical?latitude=28.61&longitude=77.21&start=2025-01-01&end=2025-01-31`

## Vercel deployment

Vercel detects `main.py` as a Python ASGI Function. No Docker, separate FastAPI server, database worker, or cron process is required. Connect this Git repository in Vercel, set the project root to the repository root, configure the environment variables below, and deploy. Verify the deployment with `/api/health`.

Required provider setup:

1. Open-Meteo requires no API key for normal non-commercial usage.
2. Create a NASA FIRMS account and set `NASA_FIRMS_MAP_KEY`.
3. Create a data.gov.in account/API key and set `DATA_GOV_API_KEY`. The CPCB adapter preserves unavailable values as null.
4. Create a managed PostgreSQL/Neon database and set `DATABASE_URL` when persistence is added. The initial serverless API does not depend on local SQLite or local files.
5. For flood detection, create a Google Cloud service account with Earth Engine access. Set `GEE_PROJECT_ID`, `GEE_SERVICE_ACCOUNT_EMAIL`, and `GEE_PRIVATE_KEY` as Vercel secrets. Store the private key only as an environment variable; never commit it.

Set `CORS_ORIGINS` to the deployed React origin(s), comma-separated. Do not use `*` in production. Risk weights are configurable through `RISK_FLOOD_WEIGHT`, `RISK_FIRE_WEIGHT`, and `RISK_POLLUTION_WEIGHT`.

## Limitations

Flood detection is a hackathon-level Sentinel-1 SAR before/after ratio heuristic. It is asynchronous, requires Earth Engine credentials and the optional `earthengine-api` dependency, and is not a scientific certification or official warning system. Provider outages are returned as structured errors and do not require local persistence.
