from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile, HTTPException
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResult
from app.services.ai.factory import get_ai_provider
from app.services.ai.base import AIProviderError
from app.config import settings
from app.services.storage.cloudinary_service import CloudinaryService

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

class PredictionService:
    @staticmethod
    async def create_prediction(
        db: AsyncSession,
        image: UploadFile,
        crop_type: str,
        farmer_notes: str | None = None
    ) -> Prediction:
        """
        Orchestrates the prediction process: validation -> storage -> AI -> DB
        """
        if not image.content_type in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=422, detail="Unsupported file type. Please upload a JPEG, PNG, or WebP.")

        # Read image
        image_bytes = await image.read()
        file_size = len(image_bytes)
        
        if file_size == 0:
            raise HTTPException(status_code=422, detail="Empty file uploaded")
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=422, detail="File size exceeds the 10MB limit.")
            
        # Call AI Provider first to avoid uploading junk if AI fails early
        provider = get_ai_provider()
        try:
            ai_result = await provider.analyze(image_bytes, crop_type, farmer_notes)
        except AIProviderError as e:
            # Do NOT create DB row for failed analysis
            raise HTTPException(status_code=502, detail=f"AI Provider Error: {str(e)}")

        # Save to Cloudinary storage
        # We use the original filename (or a sanitized version)
        try:
            image_url = await CloudinaryService.upload_image(image_bytes, image.filename or "upload.jpg")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Storage Error: Failed to upload image to Cloudinary.")

        # Save to database
        db_prediction = Prediction(
            crop_type=crop_type,
            image_filename=image.filename,
            image_url=image_url,
            farmer_notes=farmer_notes,
            predicted_disease=ai_result.disease,
            confidence=ai_result.confidence,
            severity=ai_result.severity,
            recommendation=ai_result.recommendation,
            ai_provider=settings.AI_PROVIDER.lower()
        )
        
        db.add(db_prediction)
        await db.commit()
        await db.refresh(db_prediction)
        
        return db_prediction
