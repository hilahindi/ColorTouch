import "dotenv/config";

import express from "express";
import cors from "cors";

import { GroqAiProvider } from "./services/ai/aiClient";
import { createOnboardingService } from "./services/palette/onboarding.service";
import { createPersonalizedPaletteService } from "./services/palette/personalizedPalette.service";
import { createOnboardingController } from "./api/controllers/onboarding.controller";
import { createPersonalizationController } from "./api/controllers/personalization.controller";
import { createOnboardingRouter } from "./api/routes/onboarding.routes";
import { createPersonalizationRouter } from "./api/routes/personalization.routes";

import type { BasePaletteRepository } from "./repositories/basePaletteRepository";
import type { UserAnswersRepository } from "./repositories/userAnswersRepository";
import type { PersonalizedPaletteRepository } from "./repositories/personalizedPaletteRepository";
import type { PersonalizedPaletteCache } from "./cache/personalizedPaletteCache";
import type { BasePalette } from "./types/basePalette.types";
import type { PersonalizedPalette } from "./types/personalizedPalette.types";
import type { UserAnswers } from "./types/userAnswers.types";

const PORT = Number(process.env.PORT ?? 3000);
const PORTAL_ORIGIN = process.env.PORTAL_ORIGIN ?? "http://localhost:5173";

// --- In-memory adapters --------------------------------------------------
// Stand-ins for a real DB/Redis until those exist. Data only lives for this
// process's lifetime — fine for local development, not for production.

class InMemoryBasePaletteRepository implements BasePaletteRepository {
  private readonly byDeveloperId = new Map<string, BasePalette>();

  async findByDeveloper(developerId: string): Promise<BasePalette | null> {
    return this.byDeveloperId.get(developerId) ?? null;
  }

  async save(basePalette: BasePalette): Promise<void> {
    this.byDeveloperId.set(basePalette.developer_id, basePalette);
  }
}

class InMemoryUserAnswersRepository implements UserAnswersRepository {
  private readonly byUserId = new Map<string, UserAnswers>();

  async save(userAnswers: UserAnswers): Promise<void> {
    this.byUserId.set(userAnswers.user_id, userAnswers);
  }
}

class InMemoryPersonalizedPaletteRepository implements PersonalizedPaletteRepository {
  private readonly byPaletteId = new Map<string, PersonalizedPalette>();

  async save(palette: PersonalizedPalette): Promise<void> {
    this.byPaletteId.set(palette.palette_id, palette);
  }
}

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

const aiProvider = new GroqAiProvider();
const basePaletteRepository = new InMemoryBasePaletteRepository();
const userAnswersRepository = new InMemoryUserAnswersRepository();
const personalizedPaletteRepository = new InMemoryPersonalizedPaletteRepository();
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
});

const onboardingController = createOnboardingController(onboardingService);
const personalizationController = createPersonalizationController(personalizedPaletteService);

const app = express();

app.use(cors({ origin: PORTAL_ORIGIN }));
app.use(express.json());

// Mounted at root: onboarding.routes.ts already defines the full
// "/developer/onboarding" path, and the portal is hardcoded to call
// http://localhost:3000/developer/onboarding with no prefix.
app.use(createOnboardingRouter(onboardingController));
app.use(createPersonalizationRouter(personalizationController));

app.listen(PORT, () => {
  // AiClient.ts's isMockMode() gates on NODE_ENV !== "production" — this line
  // exists so "why am I getting mock data" is answered by the terminal
  // instead of by re-reading aiClient.ts. Use `npm run dev:live` for real Groq calls.
  const aiMode = process.env.NODE_ENV === "production" ? "LIVE (Groq)" : "MOCK (fixture data)";
  console.log(`AI provider mode: ${aiMode} — NODE_ENV="${process.env.NODE_ENV ?? "undefined"}"`);
  console.log(`ColorTouch server listening on http://localhost:${PORT}`);
});
