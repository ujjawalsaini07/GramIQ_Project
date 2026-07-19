# Krishi Clinic Lite

Crop Disease Advisory Dashboard for the GramIQ Full Stack Dev Intern assignment.

Krishi Clinic Lite is a compact end-to-end crop diagnosis pipeline: upload a crop photo, add crop context, receive a structured AI diagnosis, persist the record, and review history plus aggregate analytics.

## Features

- Image upload flow with crop type suggestions, optional farmer notes, loading/error states, and client-side file validation.
- FastAPI backend validation for JPEG, PNG, and WebP uploads up to 10 MB.
- Swappable `AIProvider` interface with `groq` and deterministic `mock` providers.
- Cloudinary image storage with persisted secure image URLs.
- PostgreSQL persistence through SQLAlchemy 2.0 and Alembic migrations.
- Paginated prediction history and single prediction detail views.
- History search/filter by crop type, disease, and date range.
- CSV or PDF export for all history records or the active history filter set.
- PDF export for a single diagnosis report, including the analyzed image when available.
- Analytics summary endpoint with SQL-side aggregation for totals, disease distribution, severity distribution, average confidence, and 7-day volume.
- Docker Compose setup for frontend, backend, and database.
- CI workflow for backend tests and frontend lint/build.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Backend | FastAPI, Pydantic v2, SQLAlchemy async |
| Database | PostgreSQL 16 |
| Migrations | Alembic |
| AI | Groq primary provider, Mock provider for CI/local fallback |
| Storage | Cloudinary |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Architecture

```text
Browser
  -> Next.js frontend
  -> FastAPI REST API
  -> PredictionService
     -> AIProvider: Groq or Mock
     -> Cloudinary image upload
     -> PostgreSQL predictions table
  -> History, Detail, and Analytics views
```

Full architecture notes live in [ARCHITECTURE.md](ARCHITECTURE.md).

The full Mermaid architecture diagram is in [ARCHITECTURE.md](ARCHITECTURE.md#11-architecture-diagram).

## API

All API responses use the shared envelope:

```json
{
  "success": true,
  "data": {},
  "message": "OK",
  "errors": null
}
```

Endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Backend health check |
| `POST` | `/api/v1/predictions` | Create a prediction from multipart image upload |
| `GET` | `/api/v1/predictions?page=1&page_size=10&crop_type=tomato&disease=rust&date_from=2026-07-01&date_to=2026-07-20` | List and filter predictions, newest first |
| `GET` | `/api/v1/predictions/{id}` | Fetch a single prediction |
| `GET` | `/api/v1/analytics/summary` | Fetch aggregate dashboard data |

## Local Setup

Prerequisites:

- Docker and Docker Compose
- Groq API key for real AI analysis
- Cloudinary cloud name, API key, and API secret

1. Clone the repository.

2. Create backend environment variables:

```bash
cp backend/.env.example backend/.env
```

3. Fill `backend/.env`:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

For offline/local testing without Groq, set:

```env
AI_PROVIDER=mock
```

4. Start the full stack:

```bash
docker compose up --build
```

5. Open the app:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health
- OpenAPI schema: http://localhost:8000/api/v1/openapi.json

On startup, the backend runs Alembic migrations and seeds demo rows when the predictions table is empty.

## Development

Backend:

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

Docker:

```bash
docker compose up --build
```

## Environment Variables

Backend:

| Name | Required | Purpose |
|---|---:|---|
| `AI_PROVIDER` | Yes | `groq` or `mock` |
| `GROQ_API_KEY` | Required for Groq | Groq API authentication |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `POSTGRES_SERVER` | Docker provides default | Postgres host |
| `POSTGRES_USER` | Docker provides default | Postgres user |
| `POSTGRES_PASSWORD` | Docker provides default | Postgres password |
| `POSTGRES_DB` | Docker provides default | Postgres database |
| `FRONTEND_URL` | Docker provides default | CORS origin |

Frontend:

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Public FastAPI base URL, default `http://localhost:8000/api/v1` |

## Testing Strategy

- `MockProvider` tests verify the AI abstraction returns stable structured results.
- Route tests cover successful prediction creation, invalid upload failure, 404 detail lookup, and paginated list envelope.
- Tests use in-memory SQLite and patch Cloudinary upload, so CI does not require Postgres, Groq, or Cloudinary credentials.
- Frontend CI runs ESLint and `next build` as the TypeScript/build gate.

## Screenshots To Capture Before Submission

The app is ready for screenshots once the stack is running:

- Upload and inline diagnosis result at `/`
- Paginated prediction history at `/history`
- Single prediction detail at `/history/{id}`
- Analytics charts at `/analytics`

## Reflection

See [REFLECTION.md](REFLECTION.md) for the implementation reflection and tradeoffs.
