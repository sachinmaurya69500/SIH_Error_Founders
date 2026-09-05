from app.core.config import settings

def submit_flood_job(request) -> dict:
    if not (settings.gee_project_id and settings.gee_service_account_email and settings.gee_private_key):
        raise RuntimeError("Google Earth Engine is not configured")
    try:
        import ee
        credentials = ee.ServiceAccountCredentials(settings.gee_service_account_email, key_data=settings.gee_private_key.replace("\\n", "\n"))
        ee.Initialize(credentials, project=settings.gee_project_id)
        geometry = ee.Geometry(request.geometry)
        collection = (ee.ImageCollection("COPERNICUS/S1_GRD")
            .filterBounds(geometry).filter(ee.Filter.eq("instrumentMode", "IW"))
            .filter(ee.Filter.listContains("transmitterReceiverPolarisation", request.polarization)))
        before = collection.filterDate(request.before_start.isoformat(), request.before_end.isoformat()).select(request.polarization).median()
        after = collection.filterDate(request.after_start.isoformat(), request.after_end.isoformat()).select(request.polarization).median()
        flood = after.divide(before).gt(request.threshold).selfMask().rename("flood")
        task = ee.batch.Export.image.toAsset(image=flood, description="ecoshield-flood", region=geometry, scale=10, maxPixels=1e8)
        task.start()
        return {"status": "SUBMITTED", "task_id": task.id, "threshold": request.threshold, "polarization": request.polarization, "limitations": ["Hackathon-level SAR change heuristic; validate locally before operational use.", "Permanent-water masking and exact area calculation require a configured export/result store."]}
    except ImportError as exc:
        raise RuntimeError("Earth Engine dependency is not installed") from exc

