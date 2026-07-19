from app.services.ai.base import AIProvider
from app.services.ai.mock_provider import MockProvider
from app.config import settings

from app.services.ai.groq_provider import GroqProvider

def get_ai_provider() -> AIProvider:
    """Factory to return the configured AI Provider."""
    if settings.AI_PROVIDER.lower() == "groq":
        return GroqProvider()
    return MockProvider()
