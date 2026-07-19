from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db import get_db
from app.schemas.prediction import APIResponse, PredictionOut
from app.services.prediction_service import PredictionService
from app.models.prediction import Prediction
from uuid import UUID
from typing import Any

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
    prediction = await PredictionService.create_prediction(db, image, crop_type, farmer_notes)
    return APIResponse(success=True, data=prediction)

@router.get("/predictions", status_code=200, response_model=APIResponse[Any])
async def list_predictions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve a paginated list of predictions.
    Request: Query params — page: int, page_size: int
    Response: APIResponse envelope containing a paginated list of PredictionOut and total count
    Auth: No authentication required (single-tenant dashboard)
    Errors: 500 unexpected error
    """
    offset = (page - 1) * page_size
    
    # Get total count
    total_query = select(func.count(Prediction.id))
    total_result = await db.execute(total_query)
    total = total_result.scalar_one()
    
    # Get rows
    query = select(Prediction).order_by(desc(Prediction.created_at)).offset(offset).limit(page_size)
    result = await db.execute(query)
    rows = result.scalars().all()
    
    data = {
        "items": [PredictionOut.model_validate(row) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size
    }
    return APIResponse(success=True, data=data)

@router.get("/predictions/{id}", status_code=200, response_model=APIResponse[PredictionOut])
async def get_prediction(
    id: UUID = Path(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve a specific prediction by UUID.
    Request: Path param — id: UUID
    Response: APIResponse[PredictionOut] envelope with the full stored prediction record
    Auth: No authentication required (single-tenant dashboard)
    Errors: 404 not found, 500 unexpected error
    """
    query = select(Prediction).where(Prediction.id == id)
    result = await db.execute(query)
    prediction = result.scalar_one_or_none()
    
    if not prediction:
        raise HTTPException(status_code=404, detail=f"No prediction found with id {id}")
    return APIResponse(success=True, data=prediction)

