# ColorTouch

An Android SDK + backend service that generates a Material3 color palette for
an app, then personalizes it per end user from an in-app questionnaire,
using an LLM (Groq/Llama) as a color-psychology "design consultant."

Built for *10221 Advanced Seminar in Mobile Development* (Afeka — Tel Aviv's
College of Engineering).

## How it fits together

```
colortouch-sdk/    Android library (Kotlin) — the public SDK a consuming app depends on
sample-app/        Demo Android app ("ColorTouch Recipes") consuming the SDK
server/            Node.js/Express/TypeScript REST API + MongoDB persistence + Groq AI integration
frontend-portal/   React/Vite developer dashboard — onboarding, analytics, prompt tuning
```

**Flow:** a developer onboards their app once (`POST /developer/onboarding`)
with a category/description/personality, and the server asks the LLM to
generate a Material3 `BasePalette`. Each end user then answers a short
in-app questionnaire; the SDK sends it to `POST /personalized-palette`,
and the server asks the LLM to act as a color psychologist and derive a
personalized light/dark palette + UI behavior + a written design rationale
for that specific person. The developer dashboard (`frontend-portal`) shows
every submission, per-question answer distributions, and an AI-generated
summary of who the app's actual audience turned out to be.

## Repo structure

| Path | What it is |
|---|---|
| `colortouch-sdk/` | The Android library: `ColorTouchClient` (init, fetch, cache, fallback), Retrofit networking, Compose `ColorScheme` mapping. See its [CHANGELOG](colortouch-sdk/CHANGELOG.md). |
| `sample-app/` | A working demo app that consumes the SDK — the questionnaire bottom sheet, a themed recipe UI, reset-to-default. |
| `server/` | The API: onboarding, personalization, questions, analytics/insights. MongoDB-backed (Atlas). Groq for AI generation, with a deterministic mock mode for development. |
| `frontend-portal/` | The developer-facing dashboard: app configuration, submissions table + charts, personalization simulator, prompt tuning, system logs. |
| `JITPACK.md` | How the SDK is published/consumed via Jitpack. |
| `ColorTouch.postman_collection.json` | Every API endpoint, ready to import into Postman (see below). |

## Running it locally

### 1. Server

```bash
cd server
npm install
```

Create `server/.env`:
```
GROQ_API_KEY=your_groq_api_key
MONGODB_URI=your_mongodb_atlas_connection_string
```

```bash
npm run dev        # mock AI mode — no Groq calls, deterministic fixtures
npm run dev:live    # NODE_ENV=production — real Groq calls
```
Server listens on `http://localhost:3000`.

### 2. Developer portal

```bash
cd frontend-portal
npm install
npm run dev
```
Opens on `http://localhost:5173` (the server's CORS defaults to this origin —
set `PORTAL_ORIGIN` in `server/.env` if you run the portal elsewhere).

### 3. Sample Android app

Open the repo root in Android Studio, run the `sample-app` configuration on
an emulator or device. It talks to the server at `http://10.0.2.2:3000/`
(the emulator's alias for the host machine) — a physical device needs your
machine's real LAN IP instead (see `MainActivity.kt`).

Onboard an app via the portal's **App Configuration** page first — the
sample app only *fetches* a base palette, it doesn't onboard one itself.

## API testing

Import [`ColorTouch.postman_collection.json`](ColorTouch.postman_collection.json)
into Postman — it covers every endpoint (onboarding, personalization,
questions, analytics) with realistic example bodies, using collection
variables (`baseUrl`, `developerId`) so you're not retyping IDs.

## Publishing the SDK

See [`JITPACK.md`](JITPACK.md) for the release process and how another
project would depend on `colortouch-sdk` via Jitpack.
