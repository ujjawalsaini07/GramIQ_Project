from app.services.ai.base import AIProvider
from app.services.ai.mock_provider import MockProvider
from app.config import settings

def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER.lower() == "gemini":
        # We will implement this in Phase 2
        return MockProvider()
    return MockProvider()
