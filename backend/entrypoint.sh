#!/bin/bash

# Run Alembic migrations
alembic upgrade head

# Run seed script if present
if [ -f "seed.py" ]; then
    python seed.py
fi

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
