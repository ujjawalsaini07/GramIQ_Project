"""
Test 1 — AIProvider abstraction
Verifies MockProvider returns the correct PredictionResult shape for a known crop_type.
No external API key required.
"""
import pytest
from types import SimpleNamespace
from app.services.ai.mock_provider import MockProvider
from app.services.ai.groq_provider import GroqProvider
from app.services.ai.base import AIProviderError
from app.schemas.prediction import PredictionResult


class FakeGroqCompletions:
    """Small test double for Groq chat completions."""

    def __init__(
        self,
        content: str = "",
        finish_reason: str = "stop",
        raised_error: Exception | None = None,
    ):
        self.content = content
        self.finish_reason = finish_reason
        self.raised_error = raised_error
        self.kwargs = {}

    def create(self, **kwargs):
        """Capture request kwargs and return a Groq-like completion object."""
        self.kwargs = kwargs
        if self.raised_error:
            raise self.raised_error
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    finish_reason=self.finish_reason,
                    message=SimpleNamespace(content=self.content),
                )
            ]
        )


def groq_provider_with_fake_client(fake_completions: FakeGroqCompletions) -> GroqProvider:
    """Build a GroqProvider without calling its API-key-validating constructor."""
    provider = object.__new__(GroqProvider)
    provider.model = "qwen/qwen3.6-27b"
    provider.client = SimpleNamespace(
        chat=SimpleNamespace(completions=fake_completions)
    )
    return provider


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


@pytest.mark.asyncio
async def test_groq_provider_requests_small_json_only_completion():
    """
    GroqProvider.analyze() must request a small JSON-only completion.

    This keeps Groq's reserved token budget under the project tier limit and
    prevents Qwen reasoning tokens from leaking into message.content.
    """
    fake_completions = FakeGroqCompletions(
        '{"disease": "Leaf Rust", "confidence": 0.86, "severity": "Medium", "recommendation": "Inspect lower leaves and apply fungicide if spreading."}'
    )
    provider = groq_provider_with_fake_client(fake_completions)

    result = await provider.analyze(b"fake_image_data", "Wheat", None)

    assert result.disease == "Leaf Rust"
    assert fake_completions.kwargs["reasoning_effort"] == "none"
    assert fake_completions.kwargs["reasoning_format"] == "hidden"
    assert fake_completions.kwargs["response_format"] == {"type": "json_object"}
    assert fake_completions.kwargs["max_completion_tokens"] == 1024


@pytest.mark.asyncio
async def test_groq_provider_rejects_length_cutoff():
    """
    GroqProvider.analyze() should fail clearly when Groq cuts off the completion.
    """
    fake_completions = FakeGroqCompletions(
        "<think>unfinished reasoning",
        finish_reason="length",
    )
    provider = groq_provider_with_fake_client(fake_completions)

    with pytest.raises(AIProviderError, match="cut off"):
        await provider.analyze(b"fake_image_data", "Wheat", None)


def test_groq_provider_extracts_json_after_closed_think_block():
    """
    The defensive parser should still handle old raw reasoning responses.
    """
    provider = object.__new__(GroqProvider)
    parsed = provider._extract_json_from_response(
        '<think>private reasoning</think>{"disease": "Healthy", "confidence": 0.95}'
    )

    assert parsed["disease"] == "Healthy"
    assert parsed["confidence"] == 0.95


def test_groq_provider_invalid_json_error_does_not_leak_reasoning():
    """
    Invalid Groq content should raise a clean provider error without raw reasoning.
    """
    provider = object.__new__(GroqProvider)

    with pytest.raises(AIProviderError) as exc:
        provider._extract_json_from_response("<think>private wheat mismatch reasoning")

    assert "invalid JSON response" in str(exc.value)
    assert "private wheat mismatch reasoning" not in str(exc.value)


@pytest.mark.asyncio
async def test_groq_provider_token_budget_error_is_sanitized():
    """
    Groq 413/token-budget errors should not leak organization or billing details.
    """
    fake_completions = FakeGroqCompletions(
        raised_error=Exception(
            "Error code: 413 - organization `org_private` tokens per minute limit exceeded. "
            "Upgrade at https://console.groq.com/settings/billing"
        )
    )
    provider = groq_provider_with_fake_client(fake_completions)

    with pytest.raises(AIProviderError) as exc:
        await provider.analyze(b"fake_image_data", "Tomato", "issue here")

    message = str(exc.value)
    assert "token budget" in message
    assert "org_private" not in message
    assert "billing" not in message
