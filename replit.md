# CrisisIQ

AI-powered, accessibility-first hotel crisis response system built for Google's Solution Challenges hackathon.

**Tagline:** Every second counts. Every guest matters.

## Architecture

- `artifacts/crisisiq` — React + Vite frontend (manager dashboard, staff view, guest portal, accessibility-adapted screens)
- `artifacts/api-server` — Express API backed by an in-memory store (seeded with 4 guests, 5 staff, activity)
- `lib/api-spec` — OpenAPI contract; codegen produces `lib/api-client-react` (TanStack Query hooks) and `lib/api-zod` (request/response validators)
- `lib/integrations-gemini-ai` — Gemini AI client via the Replit AI Integrations proxy (no API key needed)

## Routes

Frontend pages: `/`, `/login`, `/checkin`, `/guest`, `/dashboard`, `/staff`.

API endpoints under `/api`:
- `guests` — list/create/get
- `staff` — list, update location/status
- `incidents` — list (filter by status), create, get, update status, post coach message
- `ai/classify`, `ai/translate`, `ai/debrief/:id`, `ai/wellness/:id`, `ai/social-radar`
- `dashboard/summary`, `dashboard/activity`

## AI features (Gemini 2.5 Flash)

- Emergency classification from free-text description
- Calm Coach replies tuned to guest accessibility (spatial-audio mode for visually impaired)
- Multilingual translation
- Post-incident debrief reports (executive summary, timeline, recommendations)
- Wellness check-in messages in the guest's language
- Social Crisis Radar threat scoring

All AI helpers fall back to deterministic responses if Gemini is unavailable.

## Demo flow

1. From `/` choose Manager/Staff/Guest.
2. Manager → `/login` → `/dashboard`: floor plan, KPIs, social radar, camera anomaly scan, evacuation routing, incident management, debrief + wellness.
3. Guest → `/checkin` → `/guest`: SOS or pictograms; accessibility-adapted experience (deaf flashing banner, non-verbal pictogram grid, visually-impaired call-style UI, wheelchair routing).
4. Staff → `/staff`: assigned tasks with accept/complete actions.
