from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.schemas.prediction import APIResponse, PredictionOut
from app.services.prediction_service import PredictionService

router = APIRouter()

@router.post("/predictions", status_code=201, response_model=APIResponse[PredictionOut])
async def create_prediction(
    crop_type: str = Form(...),
    farmer_notes: str | None = Form(None),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new crop disease prediction from an uploaded image.
    Request: multipart/form-data — image: UploadFile, crop_type: str, farmer_notes: str | None
    Response: APIResponse[PredictionOut] envelope with the full stored prediction record
    Auth: No authentication required (single-tenant dashboard)
    Errors: 422 invalid file, 502 AI provider failure, 500 unexpected error
    """
    try:
        prediction = await PredictionService.create_prediction(db, image, crop_type, farmer_notes)
        return APIResponse(success=True, data=prediction)
    except HTTPException as e:
        return APIResponse(
            success=False,
            message=e.detail,
            errors=[{"field": "image", "detail": e.detail}]
        )
