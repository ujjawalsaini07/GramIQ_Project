from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from app.schemas.prediction import APIResponse
from typing import Callable
import logging

logger = logging.getLogger(__name__)

def add_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """
        Ensures every HTTPException raised anywhere in the app (404, 422, 502, etc.)
        keeps its real status code while still returning the consistent APIResponse envelope.
        """
        return JSONResponse(
            status_code=exc.status_code,
            content=APIResponse(
                success=False,
                message=str(exc.detail),
                errors=[{"field": "request", "detail": str(exc.detail)}]
            ).model_dump()
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{"field": str(err.get("loc", [])[-1]), "detail": err.get("msg", "")} for err in exc.errors()]
        return JSONResponse(
            status_code=422,
            content=APIResponse(
                success=False,
                message="Validation Error",
                errors=errors
            ).model_dump()
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.error(f"Database error: {exc}")
        return JSONResponse(
            status_code=500,
            content=APIResponse(
                success=False,
                message="Internal database error",
                errors=[{"field": "database", "detail": "An unexpected error occurred while accessing the database."}]
            ).model_dump()
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content=APIResponse(
                success=False,
                message="Internal Server Error",
                errors=[{"field": "server", "detail": "An unexpected error occurred."}]
            ).model_dump()
        )
