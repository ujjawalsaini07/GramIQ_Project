from app.services.ai.base import AIProvider
from app.services.ai.mock_provider import MockProvider
from app.config import settings

from app.services.ai.gemini_provider import GeminiProvider

def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER.lower() == "gemini":
        return GeminiProvider()
    return MockProvider()
