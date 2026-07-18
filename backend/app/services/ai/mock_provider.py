from app.schemas.prediction import PredictionResult
from app.services.ai.base import AIProvider
import asyncio

class MockProvider(AIProvider):
    async def analyze(
        self, image_bytes: bytes, crop_type: str, farmer_notes: str | None
    ) -> PredictionResult:
        """
        Mock implementation of AIProvider.
        Returns a deterministic mock result based on crop_type without network calls.
        """
        await asyncio.sleep(1) # simulate network delay
        
        disease = "Healthy"
        confidence = 0.95
        severity = "Low"
        recommendation = "Crop looks healthy. Continue normal watering schedule."

        if "tomato" in crop_type.lower():
            disease = "Tomato Blight"
            confidence = 0.88
            severity = "High"
            recommendation = "Remove infected leaves immediately and apply copper-based fungicide."
        elif "wheat" in crop_type.lower():
            disease = "Wheat Rust"
            confidence = 0.92
            severity = "Medium"
            recommendation = "Apply appropriate fungicide if rust covers more than 5% of flag leaf."
            
        return PredictionResult(
            disease=disease,
            confidence=confidence,
            severity=severity,
            recommendation=recommendation
        )
