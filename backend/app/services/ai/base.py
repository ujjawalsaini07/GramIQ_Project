from abc import ABC, abstractmethod
from app.schemas.prediction import PredictionResult

class AIProviderError(Exception):
    pass

class AIProvider(ABC):
    @abstractmethod
    async def analyze(
        self, image_bytes: bytes, crop_type: str, farmer_notes: str | None
    ) -> PredictionResult:
        """Returns a structured prediction or raises AIProviderError."""
        pass
