from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import add_exception_handlers

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

add_exception_handlers(app)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Request: None
    Response: {"status": "ok"}
    Auth: No authentication required
    Errors: None
    """
    return {"status": "ok"}

from app.api.routes import predictions

app.include_router(predictions.router, prefix=settings.API_V1_STR)

