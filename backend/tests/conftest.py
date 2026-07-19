"""
Shared pytest fixtures for the backend test suite.
Uses an in-memory SQLite database so tests never require a live Postgres instance.
The AI_PROVIDER environment variable is forced to 'mock' so no Groq API key is needed in CI.
"""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Force mock provider before any app code is imported
os.environ["AI_PROVIDER"] = "mock"
os.environ["POSTGRES_SERVER"] = "localhost"
os.environ["POSTGRES_PORT"] = "5432"
os.environ["POSTGRES_USER"] = "postgres"
os.environ["POSTGRES_PASSWORD"] = "postgres"
os.environ["POSTGRES_DB"] = "krishi_test"

from app.main import app
from app.db import get_db
from app.models.prediction import Base  # import to register models

# Use SQLite in-memory for tests (async dialect)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create a fresh in-memory SQLite engine and tables for the whole test session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture()
async def db_session(test_engine):
    """Provide a transactional session that rolls back after each test."""
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture()
async def client(db_session):
    """Provide an AsyncClient with the DB overridden to the in-memory test session."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
