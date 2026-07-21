import base64
import json
import logging
import re
from groq import Groq
from app.services.ai.base import AIProvider, AIProviderError
from app.schemas.prediction import PredictionResult
from app.config import settings

logger = logging.getLogger(__name__)
GROQ_MAX_COMPLETION_TOKENS = 1024


class GroqProvider(AIProvider):
    """
    AI provider backed by Groq's qwen/qwen3.6-27b vision model.
    """

    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise AIProviderError("GROQ_API_KEY is not set in environment")
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "qwen/qwen3.6-27b"

    async def analyze(
        self, image_bytes: bytes, crop_type: str, farmer_notes: str | None
    ) -> PredictionResult:
        """
        Calls the Groq vision API with a base64-encoded image and returns
        a structured PredictionResult parsed from the JSON response.

        Input: image bytes, crop type, and optional farmer notes.
        Output: PredictionResult with disease, confidence, severity, and recommendation.
        Failure modes: raises AIProviderError for missing config, upstream failures,
            token-limit cutoffs, or invalid JSON responses.
        """
        try:
            base64_image = base64.b64encode(image_bytes).decode("utf-8")
            prompt = self._build_prompt(crop_type, farmer_notes)

            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                },
                            },
                        ],
                    }
                ],
                temperature=0.1,
                max_completion_tokens=GROQ_MAX_COMPLETION_TOKENS,
                top_p=1,
                stream=False,
                stop=None,
                reasoning_effort="none",
                reasoning_format="hidden",
                response_format={"type": "json_object"},
            )

            choice = completion.choices[0]
            if choice.finish_reason == "length":
                raise AIProviderError(
                    "Groq response was cut off before completing. Please retry the analysis."
                )

            raw_response = choice.message.content or ""
            data = self._extract_json_from_response(raw_response)

            return PredictionResult(
                disease=str(data.get("disease", "Unknown")),
                confidence=float(data.get("confidence", 0.0)),
                severity=str(data.get("severity", "Medium")),
                recommendation=str(data.get("recommendation", "No recommendation provided.")),
            )

        except AIProviderError:
            raise
        except Exception as e:
            error_text = str(e)
            if (
                "413" in error_text
                or "tokens per minute" in error_text.lower()
                or "rate_limit_exceeded" in error_text
            ):
                logger.warning("Groq token budget error: %s", error_text)
                raise AIProviderError(
                    "Groq request exceeded the current token budget. "
                    "Please use a smaller image or retry shortly."
                )
            raise AIProviderError(f"Groq API failure: {str(e)}")

    def _build_prompt(self, crop_type: str, farmer_notes: str | None) -> str:
        """Constructs the exact text prompt for the model."""
        prompt = (
            f"You are an expert plant pathologist. "
            f"Analyze this crop image for crop type: {crop_type}."
        )
        if farmer_notes:
            prompt += f" The farmer notes: {farmer_notes}."
            
        prompt += (
            "\n\nDiagnose any disease present. "
            "Your final answer MUST be a JSON object with exactly these keys:\n"
            '{"disease": "string", "confidence": 0.95, "severity": "Low|Medium|High", "recommendation": "string"}\n'
            "confidence is a float between 0.0 and 1.0. "
            "severity is exactly one of: Low, Medium, High. "
            "Keep the recommendation concise: 1 to 2 practical sentences. "
            "Output ONLY the JSON object as your final answer."
        )
        return prompt

    def _extract_json_from_response(self, raw: str) -> dict:
        """
        Extract a JSON object from Groq's response text.

        Input: raw response content from Groq.
        Output: parsed dictionary.
        Failure modes: raises AIProviderError when no valid JSON object is present.
        """
        # Defensive fallback: JSON mode with hidden reasoning should already return JSON,
        # but this strips closed or truncated raw reasoning if a provider response leaks it.
        content_without_think = re.sub(r"<think>.*?(?:</think>|$)", "", raw, flags=re.DOTALL).strip()

        # Search for the first occurrence of '{' and the last occurrence of '}'
        start_idx = content_without_think.find('{')
        end_idx = content_without_think.rfind('}')
        
        if start_idx == -1 or end_idx == -1 or start_idx > end_idx:
            logger.warning("Groq response did not contain JSON. Raw snippet: %r", raw[:300])
            raise AIProviderError("Groq returned an invalid JSON response.")

        json_str = content_without_think[start_idx:end_idx+1]

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse Groq JSON response: %s. Extracted snippet: %r", e, json_str[:300])
            raise AIProviderError("Groq returned an invalid JSON response.")
