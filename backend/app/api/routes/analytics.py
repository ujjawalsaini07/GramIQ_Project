from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.db import get_db
from app.models.prediction import Prediction
from app.schemas.prediction import APIResponse
from typing import Any

router = APIRouter()


@router.get("/analytics/summary", status_code=200, response_model=APIResponse[Any])
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    """
    Return aggregated analytics data computed entirely in SQL.

    Request: None
    Response: APIResponse envelope containing:
        - total_predictions: int
        - avg_confidence: float
        - disease_distribution: list[{disease, count}]
        - daily_volume: list[{date, count}] for the last 7 days
        - severity_distribution: list[{severity, count}]
    Auth: No authentication required (single-tenant dashboard, see PRD.md Non-Goals)
    Errors: 500 unexpected server error
    """
    # Total predictions
    total_result = await db.execute(select(func.count(Prediction.id)))
    total = total_result.scalar_one()

    # Average confidence
    avg_conf_result = await db.execute(select(func.avg(Prediction.confidence)))
    avg_confidence = avg_conf_result.scalar_one() or 0.0

    # Disease distribution
    disease_query = (
        select(Prediction.predicted_disease, func.count(Prediction.id).label("count"))
        .group_by(Prediction.predicted_disease)
        .order_by(func.count(Prediction.id).desc())
    )
    disease_result = await db.execute(disease_query)
    disease_distribution = [
        {"disease": row.predicted_disease, "count": row.count}
        for row in disease_result.all()
    ]

    # Daily volume — last 7 days
    daily_query = await db.execute(
        text(
            """
            SELECT DATE(created_at) AS day, COUNT(*) AS count
            FROM predictions
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY day
            ORDER BY day ASC
            """
        )
    )
    daily_volume = [
        {"date": str(row.day), "count": row.count}
        for row in daily_query.all()
    ]

    # Severity distribution
    severity_query = (
        select(Prediction.severity, func.count(Prediction.id).label("count"))
        .group_by(Prediction.severity)
        .order_by(func.count(Prediction.id).desc())
    )
    severity_result = await db.execute(severity_query)
    severity_distribution = [
        {"severity": row.severity or "Unknown", "count": row.count}
        for row in severity_result.all()
    ]

    data = {
        "total_predictions": total,
        "avg_confidence": round(float(avg_confidence), 4),
        "disease_distribution": disease_distribution,
        "daily_volume": daily_volume,
        "severity_distribution": severity_distribution,
    }
    return APIResponse(success=True, data=data)
