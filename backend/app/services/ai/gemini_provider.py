import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from app.config import settings
from app.schemas.prediction import PredictionResult
from app.services.ai.base import AIProvider, AIProviderError
import asyncio

class GeminiDiagnosis(BaseModel):
    disease: str = Field(description="Name of the disease (or 'Healthy')")
    confidence: float = Field(description="Confidence score from 0.0 to 1.0")
    severity: str = Field(description="'Low' | 'Medium' | 'High'")
    recommendation: str = Field(description="Brief actionable advice for the farmer")

class GeminiProvider(AIProvider):
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise AIProviderError("GEMINI_API_KEY is not set in environment")
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = 'gemini-2.0-flash'
        
    async def analyze(
        self, image_bytes: bytes, crop_type: str, farmer_notes: str | None
    ) -> PredictionResult:
        """
        Calls Gemini API with the image and prompts for a structured JSON response.
        """
        prompt = f"You are an expert plant pathologist. Analyze this image of a {crop_type} crop. Additional notes: {farmer_notes or 'None'}. Return a structured diagnosis."
        
        try:
            loop = asyncio.get_event_loop()
            
            # Run the synchronous generate_content in an executor
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=self.model_name,
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
                        prompt
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=GeminiDiagnosis,
                        temperature=0.1
                    )
                )
            )
            
            # The response text should be JSON due to response_schema
            result_text = response.text
            data = json.loads(result_text)
            
            return PredictionResult(
                disease=data.get("disease", "Unknown"),
                confidence=float(data.get("confidence", 0.0)),
                severity=data.get("severity", "Low"),
                recommendation=data.get("recommendation", "Consult a local agronomist.")
            )
            
        except Exception as e:
            raise AIProviderError(f"Gemini API failure: {str(e)}")
