"""
Test 1 — AIProvider abstraction
Verifies MockProvider returns the correct PredictionResult shape for a known crop_type.
No external API key required.
"""
import pytest
import asyncio
from app.services.ai.mock_provider import MockProvider
from app.schemas.prediction import PredictionResult


@pytest.mark.asyncio
async def test_mock_provider_returns_correct_shape():
    """
    MockProvider.analyze() must return a PredictionResult with all required fields
    populated and within expected value ranges.
    """
    provider = MockProvider()
    # Dummy image bytes — content does not matter for mock
    image_bytes = b"fake_image_data"
    crop_type = "Tomato"
    farmer_notes = "Leaves are turning yellow"

    result = await provider.analyze(image_bytes, crop_type, farmer_notes)

    assert isinstance(result, PredictionResult), "Result must be a PredictionResult"
    assert isinstance(result.disease, str) and len(result.disease) > 0, "disease must be a non-empty string"
    assert 0.0 <= result.confidence <= 1.0, "confidence must be between 0 and 1"
    assert result.severity in ("Low", "Medium", "High"), "severity must be one of Low/Medium/High"
    assert isinstance(result.recommendation, str) and len(result.recommendation) > 0, "recommendation must be non-empty"


@pytest.mark.asyncio
async def test_mock_provider_is_deterministic_for_same_crop():
    """
    MockProvider should return a consistent (deterministic) disease for the same crop_type.
    """
    provider = MockProvider()
    image_bytes = b"fake_image_data"

    result_1 = await provider.analyze(image_bytes, "Wheat", None)
    result_2 = await provider.analyze(image_bytes, "Wheat", None)

    assert result_1.disease == result_2.disease, "MockProvider must be deterministic for the same crop"
