import uuid
from sqlalchemy import Column, String, Float, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crop_type = Column(String(100), nullable=False)
    image_filename = Column(String(255), nullable=True)
    image_url = Column(String(1024), nullable=True)
    farmer_notes = Column(Text, nullable=True)
    predicted_disease = Column(String(150), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    severity = Column(String(50), nullable=True)
    recommendation = Column(Text, nullable=True)
    ai_provider = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)