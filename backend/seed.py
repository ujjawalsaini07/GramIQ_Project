import asyncio
import uuid
import random
from datetime import datetime, timedelta, timezone
from app.db import async_session_maker
from app.models.prediction import Prediction

DISEASES = [
    ("Tomato Blight", "High", "Remove infected leaves immediately and apply copper-based fungicide."),
    ("Wheat Rust", "Medium", "Apply appropriate fungicide if rust covers more than 5% of flag leaf."),
    ("Corn Smut", "Low", "Remove and destroy galls before they burst."),
    ("Healthy", "Low", "Crop looks healthy. Continue normal watering schedule."),
    ("Powdery Mildew", "Medium", "Apply sulfur-based fungicide and ensure good air circulation."),
    ("Leaf Spot", "Low", "Avoid overhead watering and apply appropriate fungicide if severe.")
]

CROPS = ["Tomato", "Wheat", "Corn", "Potato", "Soybean", "Rice"]

async def seed_data():
    async with async_session_maker() as session:
        # Check if we already have data
        from sqlalchemy import select, func
        query = select(func.count(Prediction.id))
        result = await session.execute(query)
        count = result.scalar_one()
        
        if count > 0:
            print("Database already seeded.")
            return

        print("Seeding database with 25 realistic rows...")
        now = datetime.now(timezone.utc)
        
        predictions = []
        for i in range(25):
            crop = random.choice(CROPS)
            disease, severity, rec = random.choice(DISEASES)
            
            # Scatter created_at over the last 14 days
            days_ago = random.uniform(0, 14)
            created_at = now - timedelta(days=days_ago)
            
            p = Prediction(
                id=uuid.uuid4(),
                crop_type=crop,
                image_filename=f"seed_image_{i}.jpg",
                farmer_notes=f"Field {random.randint(1, 10)} notes." if random.random() > 0.5 else None,
                predicted_disease=disease,
                confidence=round(random.uniform(0.70, 0.99), 2),
                severity=severity,
                recommendation=rec,
                ai_provider="mock",
                created_at=created_at
            )
            predictions.append(p)
            
        session.add_all(predictions)
        await session.commit()
        print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed_data())
