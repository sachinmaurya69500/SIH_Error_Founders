from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_invalid_coordinates():
    response = client.get("/api/weather?latitude=100&longitude=77")
    assert response.status_code == 422

def test_non_indian_coordinates_are_rejected():
    response = client.get("/api/weather?latitude=40&longitude=-73")
    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "INDIA_ONLY"

def test_overall_risk():
    data = client.get("/api/risk?flood=80&fire=40&pollution=60").json()["data"]
    assert data["overall_score"] == 62
    assert data["category"] == "HIGH"

def test_flood_geometry_validation():
    response = client.post("/api/flood/detect", json={"geometry": {"type": "Point", "coordinates": [77, 28]}, "before_start": "2026-08-01", "before_end": "2026-08-05", "after_start": "2026-08-10", "after_end": "2026-08-15"})
    assert response.status_code == 422

def test_flood_geometry_must_be_in_india():
    response = client.post("/api/flood/detect", json={"geometry": {"type": "Polygon", "coordinates": [[[ -73, 40], [-73, 41], [-72, 41], [-72, 40], [-73, 40]]]}, "before_start": "2026-08-01", "before_end": "2026-08-05", "after_start": "2026-08-10", "after_end": "2026-08-15"})
    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "INDIA_ONLY"

def test_risk_missing_values_are_not_zeroed():
    data = client.get("/api/pollution/risk").json()["data"]
    assert data["score"] == 0
    assert "AQI" in data["explanation"][0]
