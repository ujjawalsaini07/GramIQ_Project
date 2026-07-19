"""
Test 2 — Route happy path
Verifies POST /api/v1/predictions with a valid multipart request returns HTTP 201
and the correct APIResponse envelope shape.

Test 3 — Route failure path
Verifies POST /api/v1/predictions with an invalid file type returns HTTP 422
with success=False and a useful error message.
"""
import io
import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_create_prediction_happy_path(client: AsyncClient):
    """
    Happy path: a valid JPEG upload with crop_type should return HTTP 201
    with success=True and a prediction record containing all required fields.

    Request: multipart/form-data — image (JPEG), crop_type="Tomato"
    Response: 201, APIResponse[PredictionOut] with success=True
    Auth: No authentication required (single-tenant dashboard)
    """
    from unittest.mock import patch, AsyncMock
    # Patch CloudinaryService so tests never hit the real Cloudinary API
    with patch(
        "app.services.prediction_service.CloudinaryService.upload_image",
        new_callable=AsyncMock,
        return_value="https://res.cloudinary.com/test/image/upload/GRAMIQ/test_image.jpg",
    ):
        fake_jpeg = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + b"\x00" * 16
        response = await client.post(
            "/api/v1/predictions",
            files={"image": ("test_tomato.jpg", io.BytesIO(fake_jpeg), "image/jpeg")},
            data={"crop_type": "Tomato", "farmer_notes": "Test upload"},
        )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    body = response.json()
    assert body["success"] is True
    assert body["data"] is not None
    assert "predicted_disease" in body["data"]
    assert "confidence" in body["data"]
    assert "severity" in body["data"]
    assert "recommendation" in body["data"]
    assert body["data"]["crop_type"] == "Tomato"
    # Verify image_url is populated from Cloudinary
    assert body["data"]["image_url"] is not None


@pytest.mark.asyncio
async def test_create_prediction_invalid_file_type(client: AsyncClient):
    """
    Failure path: uploading a plain text file instead of an image should return HTTP 422
    with success=False and an informative error message.

    Request: multipart/form-data — image (text/plain), crop_type="Tomato"
    Response: 422, success=False, error details in body
    Auth: No authentication required (single-tenant dashboard)
    """
    fake_text_file = b"This is not an image"

    response = await client.post(
        "/api/v1/predictions",
        files={"image": ("notes.txt", io.BytesIO(fake_text_file), "text/plain")},
        data={"crop_type": "Tomato"},
    )

    assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
    body = response.json()
    assert body["success"] is False, "Upload of invalid file type must have success=False"
    assert body["message"] is not None and len(body["message"]) > 0


@pytest.mark.asyncio
async def test_get_prediction_not_found_returns_404(client: AsyncClient):
    """
    Failure path: requesting a prediction id that doesn't exist should return
    a real HTTP 404, not a 200 with success=False.

    Request: GET /api/v1/predictions/{random-uuid}
    Response: 404, success=False, error details in body
    Auth: No authentication required (single-tenant dashboard)
    """
    import uuid
    missing_id = uuid.uuid4()

    response = await client.get(f"/api/v1/predictions/{missing_id}")

    assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    body = response.json()
    assert body["success"] is False

@pytest.mark.asyncio
async def test_list_predictions_returns_envelope(client: AsyncClient):
    """
    Verifies GET /api/v1/predictions returns the correct paginated envelope.

    Request: GET with default page/page_size
    Response: 200, APIResponse with data.items, data.total, data.page, data.page_size
    Auth: No authentication required (single-tenant dashboard)
    Errors: 500 unexpected error
    """
    response = await client.get("/api/v1/predictions")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "items" in body["data"]
    assert "total" in body["data"]
    assert "page" in body["data"]
    assert "page_size" in body["data"]


@pytest.mark.asyncio
async def test_list_predictions_applies_filters(client: AsyncClient, db_session):
    """
    Verifies GET /api/v1/predictions filters by crop, disease, and date range.

    Request: GET /api/v1/predictions with crop_type, disease, date_from, date_to
    Response: 200, APIResponse with only matching paginated rows
    Auth: No authentication required (single-tenant dashboard)
    Errors: 422 invalid query params, 500 unexpected error
    """
    from app.models.prediction import Prediction

    matching_prediction = Prediction(
        crop_type="BonusCropAlpha",
        image_filename="bonus_alpha.jpg",
        image_url="https://res.cloudinary.com/test/image/upload/GRAMIQ/bonus_alpha.jpg",
        farmer_notes="Bonus filter match",
        predicted_disease="BonusRustAlpha",
        confidence=0.91,
        severity="Medium",
        recommendation="Apply the bonus filter treatment.",
        ai_provider="mock",
        created_at=datetime(2026, 7, 20, 10, 0, tzinfo=timezone.utc),
    )
    non_matching_prediction = Prediction(
        crop_type="BonusCropBeta",
        image_filename="bonus_beta.jpg",
        image_url="https://res.cloudinary.com/test/image/upload/GRAMIQ/bonus_beta.jpg",
        farmer_notes="Bonus filter miss",
        predicted_disease="BonusBlightBeta",
        confidence=0.77,
        severity="Low",
        recommendation="This row should not match.",
        ai_provider="mock",
        created_at=datetime(2026, 7, 10, 10, 0, tzinfo=timezone.utc),
    )
    db_session.add_all([matching_prediction, non_matching_prediction])
    await db_session.commit()

    response = await client.get(
        "/api/v1/predictions",
        params={
            "crop_type": "alpha",
            "disease": "rust",
            "date_from": "2026-07-20",
            "date_to": "2026-07-20",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["total"] == 1
    assert body["data"]["items"][0]["crop_type"] == "BonusCropAlpha"
