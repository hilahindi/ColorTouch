import "dotenv/config";

import express from "express";
import cors from "cors";

import { connectMongo } from "./db/mongoClient";
import { GroqAiProvider } from "./services/ai/aiClient";
import { createOnboardingService } from "./services/palette/onboarding.service";
import { createPersonalizedPaletteService } from "./services/palette/personalizedPalette.service";
import { createOnboardingController } from "./api/controllers/onboarding.controller";
import { createPersonalizationController } from "./api/controllers/personalization.controller";
import { createOnboardingRouter } from "./api/routes/onboarding.routes";
import { createPersonalizationRouter } from "./api/routes/personalization.routes";
import { createQuestionsRouter } from "./api/routes/questions.routes";
import { createAnalyticsRouter } from "./api/routes/analytics.routes";
import { createLogsRouter } from "./api/routes/logs.routes";
import { recordLog } from "./services/logs/logsService";

import { MongoBasePaletteRepository } from "./repositories/mongoBasePaletteRepository";
import { MongoUserAnswersRepository } from "./repositories/mongoUserAnswersRepository";
import { MongoPersonalizedPaletteRepository } from "./repositories/mongoPersonalizedPaletteRepository";
import { MongoSubmissionsRepository } from "./repositories/mongoSubmissionsRepository";
import type { PersonalizedPaletteCache } from "./cache/personalizedPaletteCache";
import type { PersonalizedPalette } from "./types/personalizedPalette.types";

const PORT = Number(process.env.PORT ?? 3000);
const PORTAL_ORIGIN = process.env.PORTAL_ORIGIN ?? "http://localhost:5173";

// --- In-memory cache -------------------------------------------------------
// Only the fast-path read cache stays in-memory (Redis is the intended real
// backing store per personalizedPaletteCache.ts's own comments — not set up
// yet). Losing this on restart just means the next read recomputes/refetches
// from Mongo; it isn't a data-loss concern the way the repositories were.

interface CacheEntry {
  palette: PersonalizedPalette;
  expiresAt: number | null;
}

class InMemoryPersonalizedPaletteCache implements PersonalizedPaletteCache {
  private readonly byUserId = new Map<string, CacheEntry>();

  async get(userId: string): Promise<PersonalizedPalette | null> {
    const entry = this.byUserId.get(userId);
    if (!entry) return null;

    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.byUserId.delete(userId);
      return null;
    }

    return entry.palette;
  }

  async set(userId: string, palette: PersonalizedPalette, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.byUserId.set(userId, { palette, expiresAt });
  }
}

// --- Composition root -----------------------------------------------------

async function main(): Promise<void> {
  const db = await connectMongo();

  const aiProvider = new GroqAiProvider();
  const basePaletteRepository = new MongoBasePaletteRepository(db);
  const userAnswersRepository = new MongoUserAnswersRepository(db);
  const personalizedPaletteRepository = new MongoPersonalizedPaletteRepository(db);
  const submissionsRepository = new MongoSubmissionsRepository(db);
  const personalizedPaletteCache = new InMemoryPersonalizedPaletteCache();

  const onboardingService = createOnboardingService({
    aiProvider,
    basePaletteRepository,
  });

  const personalizedPaletteService = createPersonalizedPaletteService({
    aiProvider,
    basePaletteRepository,
    userAnswersRepository,
    personalizedPaletteRepository,
    personalizedPaletteCache,
    submissionsRepository,
  });

  const onboardingController = createOnboardingController(onboardingService);
  const personalizationController = createPersonalizationController(personalizedPaletteService);

  const app = express();

  app.use(cors({ origin: PORTAL_ORIGIN }));
  app.use(express.json());

  // System Logs feed: records every request except polling of /logs itself
  // (that would just spam the feed with its own reads).
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path === "/logs") return;
      recordLog({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      });
    });
    next();
  });

  // Mounted at root: onboarding.routes.ts already defines the full
  // "/developer/onboarding" path, and the portal is hardcoded to call
  // http://localhost:3000/developer/onboarding with no prefix.
  app.use(createOnboardingRouter(onboardingController));
  app.use(createPersonalizationRouter(personalizationController));
  app.use(createQuestionsRouter());
  app.use(
    createAnalyticsRouter({
      basePaletteRepository,
      personalizedPaletteRepository,
      submissionsRepository,
      aiProvider,
    }),
  );
  app.use(createLogsRouter());

  app.listen(PORT, () => {
    // AiClient.ts's isMockMode() gates on NODE_ENV !== "production" — this line
    // exists so "why am I getting mock data" is answered by the terminal
    // instead of by re-reading aiClient.ts. Use `npm run dev:live` for real Groq calls.
    const aiMode = process.env.NODE_ENV === "production" ? "LIVE (Groq)" : "MOCK (fixture data)";
    console.log(`AI provider mode: ${aiMode} — NODE_ENV="${process.env.NODE_ENV ?? "undefined"}"`);
    console.log(`ColorTouch server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error during server startup:", err);
  process.exit(1);
});
