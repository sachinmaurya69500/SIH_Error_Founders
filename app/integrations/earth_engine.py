"""Small, serverless-safe Earth Engine jobs.

Long exports are submitted as tasks; only bounded summary reductions are evaluated
synchronously for small AOIs.
"""
from app.core.config import settings

def _initialize():
    try:
        import ee
    except ImportError as exc:
        raise RuntimeError("Earth Engine dependency is not installed") from exc
    if not (settings.gee_project_id and settings.gee_service_account_email and settings.gee_private_key):
        raise RuntimeError("Google Earth Engine is not configured")
    credentials = ee.ServiceAccountCredentials(settings.gee_service_account_email, key_data=settings.gee_private_key.replace("\\n", "\n"))
    ee.Initialize(credentials, project=settings.gee_project_id)
    return ee

def _geometry(ee, raw):
    kind = raw.get("type")
    if kind == "Feature": return ee.Geometry(raw["geometry"])
    if kind == "FeatureCollection": return ee.FeatureCollection(raw).geometry()
    return ee.Geometry(raw)

def submit_flood_job(request) -> dict:
    ee = _initialize(); geometry = _geometry(ee, request.geometry)
    collection = (ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(geometry).filter(ee.Filter.eq("instrumentMode", "IW")).filter(ee.Filter.listContains("transmitterReceiverPolarisation", request.polarization)).select(request.polarization))
    before = collection.filterDate(request.before_start.isoformat(), request.before_end.isoformat()).median()
    after = collection.filterDate(request.after_start.isoformat(), request.after_end.isoformat()).median()
    ratio = after.divide(before).rename("sar_ratio")
    flood = ratio.gt(request.threshold).selfMask()
    water_area = flood.multiply(ee.Image.pixelArea()).reduceRegion(ee.Reducer.sum(), geometry, 10, bestEffort=True, maxPixels=1e8).getInfo().get("sar_ratio")
    before_count = collection.filterDate(request.before_start.isoformat(), request.before_end.isoformat()).size().getInfo()
    after_count = collection.filterDate(request.after_start.isoformat(), request.after_end.isoformat()).size().getInfo()
    description = "ecoshield_flood_s1"
    if settings.gee_export_bucket:
        task = ee.batch.Export.image.toCloudStorage(image=flood, description=description, bucket=settings.gee_export_bucket, fileNamePrefix="ecoshield/flood", region=geometry, scale=10, maxPixels=1e8, fileFormat="GeoTIFF")
    else:
        task = ee.batch.Export.image.toDrive(image=flood, description=description, folder=settings.gee_export_folder, fileNamePrefix="ecoshield_flood", region=geometry, scale=10, maxPixels=1e8, fileFormat="GeoTIFF")
    task.start()
    return {"status": "SUBMITTED", "task_id": task.id, "flooded_area_m2": water_area, "polarization": request.polarization, "threshold": request.threshold, "source": "COPERNICUS/S1_GRD", "source_image_count": {"before": before_count, "after": after_count}, "limitations": ["SAR ratio classification is a hackathon heuristic, not an official warning.", "Export results are asynchronous and require Drive or Cloud Storage access."]}

def task_status(task_id: str) -> dict:
    ee = _initialize()
    statuses = ee.data.getTaskStatus([task_id])
    if not statuses: raise RuntimeError("Earth Engine task was not found")
    return statuses[0]

def fire_analysis(request) -> dict:
    ee = _initialize(); geometry = _geometry(ee, request.geometry)
    threshold = {"low": 7, "nominal": 8, "high": 9}[request.min_confidence]
    collection = ee.ImageCollection("MODIS/061/MOD14A1").filterBounds(geometry).filterDate(request.start.isoformat(), request.end.isoformat())
    fire = collection.select("FireMask").max().gte(threshold).selfMask()
    frp = collection.select("MaxFRP").max().updateMask(fire).multiply(0.1)
    area = fire.multiply(ee.Image.pixelArea()).reduceRegion(ee.Reducer.sum(), geometry, 1000, bestEffort=True, maxPixels=1e8).getInfo().get("FireMask")
    max_frp = frp.reduceRegion(ee.Reducer.max(), geometry, 1000, bestEffort=True, maxPixels=1e8).getInfo().get("MaxFRP")
    count = fire.reduceRegion(ee.Reducer.count(), geometry, 1000, bestEffort=True, maxPixels=1e8).getInfo().get("FireMask")
    return {"status": "COMPLETED", "fire_pixel_count": count or 0, "fire_area_m2": area or 0, "max_frp_mw": max_frp or 0, "confidence": request.min_confidence, "source": "MODIS/061/MOD14A1", "date_range": {"start": request.start.isoformat(), "end": request.end.isoformat()}, "limitations": ["MODIS fire pixels are 1 km composites and are not a substitute for field confirmation."]}
