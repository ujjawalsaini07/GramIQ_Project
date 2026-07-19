# ENGINEERING_DECISIONS.md — Krishi Clinic Lite

This file records implementation choices that affect maintainability, tradeoffs, or reviewer expectations.

## AI Provider

The backend uses a small `AIProvider` interface instead of an orchestration framework. Groq is the primary provider for real image analysis, while `MockProvider` is deterministic and requires no network. This keeps provider-specific code isolated under `backend/app/services/ai/` and lets CI run without secrets.

## Cloudinary Storage

Images are uploaded to Cloudinary after AI analysis succeeds. The service stores only the secure URL and original filename in Postgres. This avoids local upload persistence problems across containers and gives the frontend a directly renderable CDN-backed image URL.

## No Database Row On Failed Analysis

`PredictionService.create_prediction` validates the file, calls the AI provider, uploads the image, and only then writes the prediction row. This means bad files, AI failures, and storage failures do not leave partial or misleading prediction records.

## API Envelope

All JSON API endpoints return `{ success, data, message, errors }`. Error handlers preserve meaningful HTTP status codes while hiding stack traces and internal exception details from clients.

## Test Database

Backend tests use in-memory SQLite with the app's `get_db` dependency overridden. This is intentionally different from production Postgres because the tests focus on route/service contracts and need to run quickly in CI without Docker.

## CI Scope

CI runs backend pytest and frontend lint/build. The backend CI job forces `AI_PROVIDER=mock` and patches Cloudinary in route tests, so external services are not required for a green pipeline.

## Frontend State

The frontend uses local component state and a single typed fetch client instead of a global state library. The app has only four views and simple request lifecycles, so extra state infrastructure would add more indirection than value.

## History Filters And CSV Export

History search and date filters are applied server-side on `GET /api/v1/predictions` so pagination totals, table rows, and CSV export all share the same result set. The CSV export stays client-side because it is a bonus convenience feature and the existing paginated API can fetch all matching rows in bounded pages.

## PDF Export

PDF export uses a print-ready browser document instead of a new PDF generation dependency. This keeps the bundle smaller, supports browser "Save as PDF", and allows the single-diagnosis report to include the Cloudinary image directly with controlled sizing. The tradeoff is that the final save dialog is owned by the browser.

## Known Follow-Ups

- The architecture could be tightened further by extracting read queries from route modules into dedicated service modules.
- Screenshots and demo video should be captured manually from a running Docker stack before final submission.
- Second AI Provider is the next bonus candidate if there is meaningful time after screenshots and demo capture.
