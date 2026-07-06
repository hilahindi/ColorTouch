import type { PersonalizedPalette } from "../../types/personalizedPalette.types";
import type { UserAnswers } from "../../types/userAnswers.types";
import type { AiProvider } from "../ai/aiClient";
import type { BasePaletteRepository } from "../../repositories/basePaletteRepository";
import type { UserAnswersRepository } from "../../repositories/userAnswersRepository";
import type { PersonalizedPaletteRepository } from "../../repositories/personalizedPaletteRepository";
import type { PersonalizedPaletteCache } from "../../cache/personalizedPaletteCache";
import { validatePersonalizedPalette } from "../../validation/schemaValidator";
import { buildPersonalizedPalettePrompt, type AiPrompt } from "../ai/promptBuilder";

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
  basePaletteVersion: number,
): boolean {
  return (
    cached.base_palette_id === basePaletteId &&
    cached.base_palette_version === basePaletteVersion
  );
}

/**
 * Wires the given repositories/cache/AI provider into a
 * getOrGeneratePersonalizedPalette function. A composition root constructs
 * the concrete adapters (Postgres repositories, Redis cache, GroqAiProvider)
 * and calls this once at startup — no adapter is hardcoded here so the
 * service stays testable with in-memory fakes.
 */
export function createPersonalizedPaletteService(
  deps: PersonalizedPaletteServiceDeps,
) {
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
    userAnswers: UserAnswers,
    options: { debug?: boolean; systemPromptOverride?: string } = {},
  ): Promise<PersonalizedPalette> {
    // The passed-in answers are this user's latest submission of record —
    // persist them regardless of whether the cache below is a hit or miss.
    await userAnswersRepository.save(userAnswers);

    const basePalette =
      await basePaletteRepository.findByDeveloper(developerId);
    if (!basePalette) {
      throw new BasePaletteNotFoundError(developerId);
    }

    // Debug/prompt-tuning calls always regenerate — returning a stale cached
    // palette would make experimenting with a new prompt look like it did
    // nothing.
    if (!options.debug) {
      const cached = await personalizedPaletteCache.get(userId);
      if (
        cached &&
        isFreshForBase(cached, basePalette.palette_id, basePalette.version)
      ) {
        return cached;
      }
    }

    const generated = await aiProvider.generatePersonalizedPalette({
      basePalette,
      userId,
      userAnswers,
      systemPromptOverride: options.systemPromptOverride,
    });

    // aiProvider.generatePersonalizedPalette() already validates internally,
    // but this service is the boundary the controller trusts — re-validate
    // here so that guarantee holds even if the AiProvider implementation
    // changes underneath it.
    validatePersonalizedPalette(generated);

    await Promise.all([
      personalizedPaletteRepository.save(generated),
      personalizedPaletteCache.set(
        userId,
        generated,
        generated.cache_control?.ttl_seconds,
      ),
    ]);

    console.log(
      `Generated personalized palette for user "${userId}": ${JSON.stringify(generated)}`,
    );

    return generated;
  }

  /**
   * Debug-only: reconstructs the exact prompt that would be (or was) sent to
   * the AI provider for this developerId/userAnswers pair, without calling
   * the provider itself. buildPersonalizedPalettePrompt is a pure function of
   * (basePalette, userAnswers), so this is guaranteed identical to what
   * getOrGeneratePersonalizedPalette actually sends — not a re-implementation
   * that could drift from it. Returns null if there's no BasePalette yet for
   * this developer (nothing to build a prompt against).
   */
  async function buildDebugPrompt(
    developerId: string,
    userAnswers: UserAnswers,
    systemPromptOverride?: string,
  ): Promise<AiPrompt | null> {
    const basePalette = await basePaletteRepository.findByDeveloper(developerId);
    if (!basePalette) return null;
    const prompt = buildPersonalizedPalettePrompt(basePalette, userAnswers);
    return systemPromptOverride ? { ...prompt, system: systemPromptOverride } : prompt;
  }

  return { getOrGeneratePersonalizedPalette, buildDebugPrompt };
}
