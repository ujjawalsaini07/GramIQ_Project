# REFLECTION.md — Krishi Clinic Lite

## What Went Well

The strongest part of the build is the clean end-to-end path. The upload flow, backend validation, AI provider abstraction, storage, persistence, history, detail, and analytics views all connect through a small set of understandable contracts.

The `MockProvider` also paid off quickly. It made local testing and CI independent from Groq credentials while still exercising the same service and route paths as the real provider.

## What Was Tricky

The main design tension was sequencing prediction creation. Uploading before AI analysis can waste storage on failed predictions, while analyzing before upload means the image is read into memory first. For this assignment's 10 MB limit, analyzing first is a reasonable tradeoff because it preserves the stronger guarantee: failed analyses do not create database rows or uploaded image records.

The second tricky area was documentation drift. The implementation moved from local storage/Gemini-era assumptions to Cloudinary/Groq, so Phase 4 included an explicit alignment pass to make the docs match the code reviewers will read.

## What I Would Improve Next

I would extract analytics and prediction read queries into service classes so every route is only parse/delegate/return. The current backend is still small, but that split would make it easier to add filters, exports, and authorization later.

I would also add frontend component tests or Playwright smoke tests once the core assignment is complete. The backend has meaningful automated coverage, but the dashboard interactions are currently verified through lint/build and manual testing.

