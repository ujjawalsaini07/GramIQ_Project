# Engineering Decisions — Krishi Clinic Lite

This document records the choices made while building Krishi Clinic Lite that affect maintainability, correctness, or reviewer expectations — what was decided, why, and what it costs. The brief calls out that ambiguity is intentional in places and resolving it well is part of what's being assessed; this file is where that resolution is made explicit rather than left implicit in the code.

---

## 1. Service Layer Between Routes and Everything Else

**Decision:** Routes in `api/routes/` never contain business logic. They parse input, call exactly one method on a service (`PredictionService`), and return the result. All orchestration — validation, calling the AI provider, uploading to storage, writing to the database — lives in `services/`.

**Why:** The brief explicitly evaluates "thin routes that delegate to a services layer, not routes packed with business logic." It also makes the AI-provider-swap requirement trivial to satisfy, since the route layer has no path to reach into a specific provider's SDK.

**Tradeoff:** For an app this small, a thin service layer is a small amount of indirection for a request pattern that's otherwise simple CRUD. That cost is deliberately accepted because the brief is explicitly grading for this separation, and it's the difference between "a small change" and "a rewrite" the moment a second AI provider or a second storage backend gets added.

---

## 2. AI Provider Abstraction

**Decision:** All AI calls go through an abstract `AIProvider` interface (`analyze(image_bytes, crop_type, farmer_notes) -> PredictionResult`). Two implementations exist: `GroqProvider` (real multimodal inference) and `MockProvider` (deterministic, no network). A `factory.py` reads `AI_PROVIDER` from the environment and returns the correct instance. No route, model, or frontend component ever branches on which provider is active.

**Why:** This is the single requirement the brief calls out as "the requirement that actually matters" for the AI integration section. A hand-rolled interface was chosen over a framework (LangChain, CrewAI, etc.) because the brief states explicitly that a framework earns no extra credit over a plain abstraction, and a framework would add a dependency and a learning-curve tax with no corresponding benefit at this scope.

**Tradeoff:** `MockProvider`'s deterministic lookup table is intentionally simple (keyed by crop type) rather than trying to simulate realistic AI variance. That's fine for exercising the route/service contract in tests and CI, but it means CI never actually validates Groq's response-parsing branch — that branch is only exercised in real, non-CI runs. This is a known gap; see §11.

---

## 3. Sequencing: Validate → Analyze → Upload → Persist (No Row on Failure)

**Decision:** `PredictionService.create_prediction` runs in this order: (1) validate the uploaded file (MIME type, size), (2) call the AI provider, (3) upload the image to Cloudinary, (4) write the `Prediction` row. If any step fails, the function raises and nothing is written — there is no partial or misleading database record left behind.

**Why:** A dashboard where the history table contains rows for uploads that never actually got diagnosed would be worse than a dashboard that simply reports "this failed, try again." Keeping analysis before persistence means the stored data is always trustworthy.

**Tradeoff:** This ordering means a failed image upload (step 3) still incurred the cost of an AI call (step 2) for nothing. The alternative — uploading first, then analyzing — avoids that wasted AI call but risks orphaned images in Cloudinary when analysis subsequently fails, which is a worse failure mode for this assignment's purposes (unused storage is cheap and invisible; a stale untracked image is a silent leak). Given the file size constraints here (10 MB cap) and Groq's failure rate being the rarer of the two failure modes in practice, this tradeoff was made deliberately in favor of stronger data integrity over avoiding a wasted API call.

---

## 4. Cloudinary for Image Storage (Not Local Disk)

**Decision:** Images are streamed directly to Cloudinary after AI analysis succeeds; only the resulting secure `image_url` and original filename are stored in Postgres. The old local filesystem storage experiment was removed once Cloudinary became the active path.

**Why:** The brief allows local storage for this assignment but explicitly asks for the storage approach to be documented and designed so that swapping in cloud storage later would be a small change. Rather than build local storage and describe how it *could* be swapped, Cloudinary was used directly — this sidesteps two real problems with local disk in a multi-container Docker Compose setup: (1) uploaded files need a shared volume to survive a container restart or be visible across the `backend` container's lifecycle, and (2) the frontend needs a directly reachable URL to render the image, which a bare local path doesn't give you without also standing up static file serving.

**Tradeoff:** This is a deviation from "images may be stored locally" as literally written, resolved in the direction the brief's own follow-up sentence points toward ("design your code so replacing local storage with cloud storage would require minimal changes"). The cost is that a reviewer running this project entirely offline needs valid Cloudinary credentials for the upload step to succeed, even when using the Mock AI provider — Mock only removes the AI dependency, not the storage dependency.

---

## 5. Consistent API Envelope + Real HTTP Status Codes

**Decision:** Every JSON response — success or failure — follows `{ success, data, message, errors }`. Failures use real, meaningful HTTP status codes (`404` for a missing prediction, `422` for a bad upload, `502` for an AI provider failure, `500` for anything unexpected), not a `200` with `success: false` hiding the actual failure mode.

**Why:** The brief explicitly requires "consistent JSON error responses with correct HTTP status codes." A shared `APIResponse` envelope, combined with a dedicated `HTTPException` handler in `core/exceptions.py` that preserves the raised status code while still returning the same envelope shape, means clients (and API consumers generally, like a future mobile app) can rely on both the envelope shape *and* the status code being meaningful — they aren't forced to inspect the body just to find out something failed.

**Correction made:** An earlier version of this codebase caught `HTTPException` at the route level and downgraded every error to a `200`/`201` response with `success: false` inside the body. That was a genuine bug relative to the brief's explicit requirement and has been fixed — `create_prediction` now lets `HTTPException` propagate to the global handler, and `get_prediction`'s not-found case now raises a real `404` instead of returning a `200`. Tests were updated to assert on the corrected status codes (`test_create_prediction_invalid_file_type` now asserts `422`; a new `test_get_prediction_not_found_returns_404` was added).

---

## 6. No DB Row on Failed Analysis / Global Exception Handling

**Decision:** Beyond the sequencing in §3, all uncaught exceptions are caught by global handlers in `core/exceptions.py` — one for `HTTPException`, one for `RequestValidationError` (422), one for `SQLAlchemyError` (500, generic message), and a catch-all `Exception` handler (500, generic message). No handler ever leaks a stack trace or internal exception text to the client; full details go to server logs only.

**Why:** The brief explicitly calls for "no leaked stack traces" and asks what happens when the AI provider times out or the database is unavailable. Centralizing this in `core/exceptions.py` means every route gets this behavior for free rather than needing its own try/except boilerplate.

---

## 7. Database Indexes on `created_at` and `predicted_disease`

**Decision:** Both columns are indexed — `created_at` because every history/list query orders by it (and the analytics 7-day volume query filters on it), and `predicted_disease` because the analytics endpoint groups by it and the history filter searches on it. This is enforced both in the SQLAlchemy model (`index=True`) and in a dedicated Alembic migration (`create_index`) so a fresh database and an upgraded existing database end up in the same state.

**Why:** The brief lists these two indexes explicitly in the required minimum schema (Section 7.3). An earlier version of this project defined the columns without indexes; this was a real gap against the brief and has been corrected with its own migration rather than folded silently into an unrelated change, so the schema history stays honest and reviewable.

---

## 8. Test Database: In-Memory SQLite, Not Postgres

**Decision:** Backend tests override the `get_db` dependency to use in-memory SQLite instead of a real Postgres connection, and patch the Cloudinary upload call so no network request happens in a test run.

**Why:** The tests are verifying route/service *contracts* (status codes, envelope shape, provider behavior) rather than Postgres-specific SQL behavior. Running tests without a live Postgres instance means CI doesn't need a database service container just to go green, and a contributor can run `pytest` immediately after `pip install -r requirements.txt` with zero additional setup.

**Tradeoff:** SQLite and Postgres are not identical — this setup would not catch a Postgres-specific SQL error (e.g. in the raw `text()` query used for `daily_volume` in the analytics endpoint, which relies on Postgres date functions). That query path is currently only exercised against real Postgres via manual testing and the Docker Compose stack, not by the automated test suite. This is a known gap; see §11.

---

## 9. Frontend State: Local Component State, No Global Store

**Decision:** The frontend uses local `useState`/`useEffect` state per view and a single typed fetch client (`services/api.ts`) rather than a global state library (Redux, Zustand, React Query, etc.).

**Why:** There are four views, each with a simple, mostly-independent request lifecycle (fetch on mount, or fetch on user action). Introducing a global store or a data-fetching library would add a layer of indirection and a dependency with no corresponding benefit at this scope — it would be optimizing for a scale this app doesn't have yet.

---

## 10. History Filters, CSV Export, and PDF Export (Bonus)

**Decision:** Crop type, disease, and date-range filters on `GET /api/v1/predictions` are applied **server-side**, so the paginated table, the total count, and any export always agree on the same result set. CSV export is generated client-side from already-fetched rows. PDF export (for both the filtered history and a single diagnosis) uses a print-ready HTML document and the browser's native "Save as PDF" rather than pulling in a PDF-generation library.

**Why:** Server-side filtering avoids the bug class where a client-side filter shows 5 rows but an export button dumps all 42 unfiltered rows. Using the browser's print pipeline for PDF avoids adding a client-side PDF-rendering dependency (larger bundle, more surface area) for what the brief treats as optional bonus polish, and it naturally supports embedding the Cloudinary image in the single-diagnosis report with the browser handling layout.

**Tradeoff:** The exact PDF output (margins, page breaks, "Save" vs "Print" wording) is owned by the user's browser rather than pixel-controlled by the app. Acceptable for a bonus feature; would reconsider if PDF export became a primary, must-look-identical-everywhere feature.

---

## 11. Known Gaps and Deliberate Non-Goals

Being explicit about what was cut or left as a known limitation, per the brief's own guidance to prefer an honest account of partial completion over hidden gaps:

- **CI only exercises the Mock AI provider**, never Groq — the real provider's response-parsing path is untested by automation. Would add a small recorded-response fixture test if there were more time.
- **The `daily_volume` analytics query uses a raw Postgres-specific `text()` query**, which isn't covered by the SQLite-backed test suite. Low risk (it's a simple `GROUP BY DATE(...)`), but worth flagging rather than implying full coverage.
- **Read queries for `list_predictions` and `analytics/summary` still live directly inside their route functions** rather than in a dedicated query/service module. Fine at this size; the first refactor target if the API grows more endpoints or filters.
- **No authentication, no multi-tenancy, no delete/update endpoints** — all intentional non-goals matching the brief's required contract (create, list, get) and single-tenant framing.
- **Only one real AI provider is implemented** (Groq). The abstraction supports a second cleanly; a second provider simply wasn't built in the time available after the required scope and the filter/export bonus work.
- Screenshots and the demo video are captured last, from a fully running Docker stack, right before submission — not before the underlying features exist to screenshot.
