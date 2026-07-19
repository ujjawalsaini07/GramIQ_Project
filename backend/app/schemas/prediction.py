from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Literal, Optional, Generic, TypeVar

T = TypeVar("T")

class ErrorDetail(BaseModel):
    field: str
    detail: str

class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    message: str = "OK"
    errors: Optional[list[ErrorDetail]] = None

class PredictionResult(BaseModel):
    disease: str
    confidence: float
    severity: Literal["Low", "Medium", "High"] | None = None
    recommendation: str | None = None

class PredictionOut(BaseModel):
    id: UUID
    crop_type: str
    image_filename: str | None
    image_url: str | None = None
    farmer_notes: str | None
    predicted_disease: str
    confidence: float
    severity: str | None
    recommendation: str | None
    ai_provider: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
