from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile, HTTPException
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResult
from app.services.ai.factory import get_ai_provider
from app.services.ai.base import AIProviderError

class PredictionService:
    @staticmethod
    async def create_prediction(
        db: AsyncSession,
        image: UploadFile,
        crop_type: str,
        farmer_notes: str | None = None
    ) -> Prediction:
        """
        Orchestrates the prediction process: validation -> AI -> storage
        """
        # Read image
        image_bytes = await image.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=422, detail="Empty file uploaded")
            
        provider = get_ai_provider()
        try:
            ai_result = await provider.analyze(image_bytes, crop_type, farmer_notes)
        except AIProviderError as e:
            raise HTTPException(status_code=502, detail="AI Provider Error")

        # Save to database
        db_prediction = Prediction(
            crop_type=crop_type,
            image_filename=image.filename, # Using original filename for now since we skip real storage in Phase 1
            farmer_notes=farmer_notes,
            predicted_disease=ai_result.disease,
            confidence=ai_result.confidence,
            severity=ai_result.severity,
            recommendation=ai_result.recommendation,
            ai_provider="mock" # hardcode for phase 1
        )
        
        db.add(db_prediction)
        await db.commit()
        await db.refresh(db_prediction)
        
        return db_prediction
