import type { PersonalizedPalette } from "../../types/personalizedPalette.types";
import type { UserAnswers } from "../../types/userAnswers.types";
import type { AiProvider } from "../ai/aiClient";
import type { BasePaletteRepository } from "../../repositories/basePaletteRepository";
import type { UserAnswersRepository } from "../../repositories/userAnswersRepository";
import type { PersonalizedPaletteRepository } from "../../repositories/personalizedPaletteRepository";
import type { PersonalizedPaletteCache } from "../../cache/personalizedPaletteCache";
import { validatePersonalizedPalette } from "../../validation/schemaValidator";

export class BasePaletteNotFoundError extends Error {
  constructor(developerId: string) {
    super(`No BasePalette found for developer "${developerId}"`);
    this.name = "BasePaletteNotFoundError";
  }
}

export interface PersonalizedPaletteServiceDeps {
  aiProvider: AiProvider;
  basePaletteRepository: BasePaletteRepository;
  userAnswersRepository: UserAnswersRepository;
  personalizedPaletteRepository: PersonalizedPaletteRepository;
  personalizedPaletteCache: PersonalizedPaletteCache;
}

function isFreshForBase(
  cached: PersonalizedPalette,
  basePaletteId: string,
  basePaletteVersion: number
): boolean {
  return (
    cached.base_palette_id === basePaletteId && cached.base_palette_version === basePaletteVersion
  );
}

/**
 * Wires the given repositories/cache/AI provider into a
 * getOrGeneratePersonalizedPalette function. A composition root constructs
 * the concrete adapters (Postgres repositories, Redis cache, GrokAiProvider)
 * and calls this once at startup — no adapter is hardcoded here so the
 * service stays testable with in-memory fakes.
 */
export function createPersonalizedPaletteService(deps: PersonalizedPaletteServiceDeps) {
  const {
    aiProvider,
    basePaletteRepository,
    userAnswersRepository,
    personalizedPaletteRepository,
    personalizedPaletteCache,
  } = deps;

  async function getOrGeneratePersonalizedPalette(
    developerId: string,
    userId: string,
    userAnswers: UserAnswers
  ): Promise<PersonalizedPalette> {
    // The passed-in answers are this user's latest submission of record —
    // persist them regardless of whether the cache below is a hit or miss.
    await userAnswersRepository.save(userAnswers);

    const basePalette = await basePaletteRepository.findByDeveloper(developerId);
    if (!basePalette) {
      throw new BasePaletteNotFoundError(developerId);
    }

    const cached = await personalizedPaletteCache.get(userId);
    if (cached && isFreshForBase(cached, basePalette.palette_id, basePalette.version)) {
      return cached;
    }

    const generated = await aiProvider.generatePersonalizedPalette({
      basePalette,
      userId,
      userAnswers,
    });

    // aiProvider.generatePersonalizedPalette() already validates internally,
    // but this service is the boundary the controller trusts — re-validate
    // here so that guarantee holds even if the AiProvider implementation
    // changes underneath it.
    validatePersonalizedPalette(generated);

    await Promise.all([
      personalizedPaletteRepository.save(generated),
      personalizedPaletteCache.set(userId, generated, generated.cache_control?.ttl_seconds),
    ]);

    return generated;
  }

  return { getOrGeneratePersonalizedPalette };
}
