import type { AppMetadata, BasePalette } from "../../types/basePalette.types";
import type { AiProvider } from "../ai/aiClient";
import type { BasePaletteRepository } from "../../repositories/basePaletteRepository";
import { validateBasePalette } from "../../validation/schemaValidator";

// A developer's very first BasePalette is always version 1 — later
// re-generations bump this, but onboarding only ever creates the first one.
const INITIAL_BASE_PALETTE_VERSION = 1;

export interface OnboardingServiceDeps {
  aiProvider: AiProvider;
  basePaletteRepository: BasePaletteRepository;
}

/**
 * Wires the given AiProvider/repository into an onboardDeveloper function. A
 * composition root constructs the concrete adapters and calls this once at
 * startup — same DI shape as createPersonalizedPaletteService.
 */
export function createOnboardingService(deps: OnboardingServiceDeps) {
  const { aiProvider, basePaletteRepository } = deps;

  async function onboardDeveloper(
    developerId: string,
    appMetadata: AppMetadata
  ): Promise<BasePalette> {
    const basePalette = await aiProvider.generateBasePalette({
      developerId,
      version: INITIAL_BASE_PALETTE_VERSION,
      appMetadata,
    });

    // aiProvider.generateBasePalette() already validates internally, but
    // this service is the boundary the controller trusts — re-validate here
    // so that guarantee holds even if the AiProvider implementation changes.
    validateBasePalette(basePalette);

    await basePaletteRepository.save(basePalette);

    return basePalette;
  }

  /**
   * Looks up the BasePalette already generated for developerId — used to
   * hand a consuming app its developer's actual colors as its startup
   * default, instead of a hardcoded fallback baked into the app. Returns
   * null if onboarding hasn't run yet for this developer.
   */
  async function getBasePalette(developerId: string): Promise<BasePalette | null> {
    return basePaletteRepository.findByDeveloper(developerId);
  }

  return { onboardDeveloper, getBasePalette };
}
