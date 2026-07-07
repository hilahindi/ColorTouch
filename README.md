# ColorTouch System

The backend + developer dashboard for ColorTouch: a service that generates
a Material3 color palette for an app, then personalizes it per end user
from an in-app questionnaire, using an LLM (Groq/Llama) as a
color-psychology "design consultant."

Built for *10221 Advanced Seminar in Mobile Development* (Afeka — Tel Aviv's
College of Engineering).

The Android SDK + demo app that consume this API live in a separate repo:
[ColorTouch-SDK](https://github.com/hilahindi/ColorTouch-SDK).

## How it fits together

```
server/            Node.js/Express/TypeScript REST API + MongoDB persistence + Groq AI integration
frontend-portal/   React/Vite developer dashboard — onboarding, analytics, prompt tuning
```

**Flow:** a developer onboards their app once (`POST /developer/onboarding`)
with a category/description/personality, and the server asks the LLM to
generate a Material3 `BasePalette`. Each end user then answers a short
in-app questionnaire (via the ColorTouch SDK); the SDK sends it to
`POST /personalized-palette`, and the server asks the LLM to act as a color
psychologist and derive a personalized light/dark palette + UI behavior + a
written design rationale for that specific person. The developer dashboard
(`frontend-portal`) shows every submission, per-question answer
distributions, and an AI-generated summary of who the app's actual audience
turned out to be.

## Repo structure

| Path | What it is |
|---|---|
| `server/` | The API: onboarding, personalization, questions, analytics/insights. MongoDB-backed (Atlas). Groq for AI generation, with a deterministic mock mode for development. |
| `frontend-portal/` | The developer-facing dashboard: app configuration, submissions table + charts, personalization simulator, prompt tuning, system logs. |
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

See [ColorTouch-SDK](https://github.com/hilahindi/ColorTouch-SDK) — clone
it separately and open it in Android Studio. Onboard an app via this
portal's **App Configuration** page first — the sample app only *fetches*
a base palette, it doesn't onboard one itself.

## API testing

Import [`ColorTouch.postman_collection.json`](ColorTouch.postman_collection.json)
into Postman — it covers every endpoint (onboarding, personalization,
questions, analytics) with realistic example bodies, using collection
variables (`baseUrl`, `developerId`) so you're not retyping IDs.
