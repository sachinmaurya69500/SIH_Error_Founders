# EcoShield API

EcoShield is the backend for an environmental monitoring project focused on India. It brings together weather, rainfall, air quality, active fire, and flood information and exposes the results through a small REST API.

The API is built with FastAPI and can run locally with Uvicorn or deploy directly to Vercel. The frontend is maintained separately.

## Running locally

Create a virtual environment and install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Start the development server:

```bash
uvicorn main:app --reload
```

Once it is running, the API documentation is available at:

- http://localhost:8000/docs
- http://localhost:8000/redoc

## India coverage

The location-based endpoints accept coordinates within the following approximate bounding box:

- Latitude: 6.5°N to 37.5°N
- Longitude: 68°E to 97.5°E

This keeps the project focused on India. Pollution data comes from India’s CPCB/data.gov.in service, and NASA FIRMS hotspot requests default to India.

## Endpoints

All successful responses follow this general structure:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Available endpoints include:

```text
GET  /api/health
GET  /api/weather?latitude=28.61&longitude=77.21&forecast_days=7
GET  /api/rainfall?latitude=28.61&longitude=77.21
GET  /api/fire/hotspots?area=india&days=1
GET  /api/fire/risk?temperature=38&humidity=25&wind=20&hotspots=3
GET  /api/pollution
GET  /api/pollution/risk?aqi=180
GET  /api/flood/risk?rainfall_24h=120&forecast_rainfall=80
POST /api/flood/detect
GET  /api/risk?flood=78&fire=41&pollution=63
GET  /api/alerts?risk=80&type=flood&location=Delhi
GET  /api/locations
GET  /api/historical?latitude=28.61&longitude=77.21&start=2025-01-01&end=2025-01-31
```

The flood detection request accepts a GeoJSON Polygon or MultiPolygon along with before and after date ranges. It submits a Sentinel-1 change-detection job to Google Earth Engine and returns the task ID when Earth Engine is configured.

## Data providers and configuration

Copy `.env.example` to `.env` for local development. The following services are used:

- Open-Meteo: weather and rainfall; no key is needed for normal non-commercial use.
- NASA FIRMS: active fire hotspots; requires `NASA_FIRMS_MAP_KEY`.
- data.gov.in/CPCB: air quality observations; requires `DATA_GOV_API_KEY`.
- NASA POWER: historical climate data; no key is normally needed.
- Google Earth Engine: Sentinel-1 flood detection; requires `GEE_PROJECT_ID`, `GEE_SERVICE_ACCOUNT_EMAIL`, and `GEE_PRIVATE_KEY`.

`DATABASE_URL` is reserved for the managed PostgreSQL database used by the production version. The current API does not depend on local SQLite or local file storage.

Set `CORS_ORIGINS` to the URL of the React frontend. Multiple origins can be separated with commas. Risk weights can be adjusted with `RISK_FLOOD_WEIGHT`, `RISK_FIRE_WEIGHT`, and `RISK_POLLUTION_WEIGHT`.

## Deploying to Vercel

The repository contains both applications. Vercel builds the React app from `frontend/` and exposes the FastAPI application from `main.py`, so the frontend and backend share one deployment and the frontend can call `/api/...` without a separate server URL.

For local frontend development:

```bash
cd frontend
npm install
npm run dev
```

The frontend uses `/api` by default. To point it at a separately running backend during development, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL=http://localhost:8000/api`.

Connect the repository to Vercel and set the environment variables in the project settings. The included `vercel.json` runs the frontend build and publishes `frontend/dist`, while Vercel detects `main.py` as the FastAPI entry point.

After deployment, check the following URL:

```text
https://your-project.vercel.app/api/health
```

The Earth Engine dependency is optional. Install and configure it only when `/api/flood/detect` is needed. Flood detection is intended for the hackathon and should not be treated as an official warning or scientifically certified flood product.

## Tests

Run the test suite with:

```bash
pytest
```
