import type { Request, Response } from "express";

import type { createOnboardingService } from "../../services/palette/onboarding.service";
import { AiGenerationError } from "../../services/ai/aiClient";
import { SchemaValidationError } from "../../validation/schemaValidator";
import type { AppMetadata, BasePalette } from "../../types/basePalette.types";
import type { PersonalizedPalette } from "../../types/personalizedPalette.types";

type OnboardingService = ReturnType<typeof createOnboardingService>;

interface OnboardingRequestBody {
  developerId: string;
  appMetadata: AppMetadata;
}

/**
 * Adapts a BasePalette to the same wire shape as a PersonalizedPalette
 * (PaletteResponse on the SDK side) so a consuming app can point its "default
 * palette" fetch at the same client model it already uses for personalized
 * results, without a second parallel type. bi_insights here describes the
 * palette itself, not a user, since no questionnaire has been answered yet.
 */
function toDefaultPaletteResponse(basePalette: BasePalette): PersonalizedPalette {
  return {
    schema_version: basePalette.schema_version,
    palette_id: basePalette.palette_id,
    base_palette_id: basePalette.palette_id,
    base_palette_version: basePalette.version,
    user_id: "",
    colors: basePalette.colors,
    ui_behavior: {
      border_radius_dp: 16,
      animation_speed: "normal",
      contrast_level: "normal",
      elevation_style: "shadowed",
    },
    bi_insights: {
      persona_label: "Default",
      confidence_score: 0,
      traits: [],
      mutation_reason: "Developer-supplied base palette — no questionnaire has been submitted yet.",
    },
    generated_at: basePalette.generated_at,
  };
}

/**
 * Wires an OnboardingService instance into an Express controller.
 * requireFields/validateAppMetadata middleware (see ../middleware) already
 * guaranteed the request shape by the time this runs — this layer only maps
 * service-level failures onto HTTP status codes.
 */
export function createOnboardingController(service: OnboardingService) {
  async function onboardDeveloper(req: Request, res: Response): Promise<void> {
    const { developerId, appMetadata } = req.body as OnboardingRequestBody;

    try {
      const basePalette = await service.onboardDeveloper(developerId, appMetadata);
      res.status(201).json(basePalette);
    } catch (err) {
      if (err instanceof AiGenerationError) {
        // 503, not 500: this isn't the caller's fault and may well succeed
        // on retry once the AI provider recovers.
        res.status(503).json({
          error: "AiGenerationFailed",
          message: "Base palette generation is temporarily unavailable. Please retry shortly.",
        });
        return;
      }

      if (err instanceof SchemaValidationError) {
        // The service already validates before returning — reaching here
        // means the generated data was structurally invalid, a server bug
        // rather than a client or transient AI issue.
        res.status(500).json({
          error: "SchemaValidationFailed",
          message: "Generated base palette failed internal validation.",
        });
        return;
      }

      res.status(500).json({
        error: "InternalError",
        message: "An unexpected error occurred during developer onboarding.",
      });
    }
  }

  /**
   * Lets a consuming app fetch its developer's actual generated BasePalette
   * to use as its startup default — see ColorTouchClient.setDefaultPalette
   * on the SDK side. 404 means onboarding hasn't run yet for this developer.
   */
  async function getDefaultPalette(req: Request, res: Response): Promise<void> {
    const { developerId } = req.params;

    const basePalette = await service.getBasePalette(developerId);
    if (!basePalette) {
      res.status(404).json({
        error: "BasePaletteNotFound",
        message: `No BasePalette found for developer "${developerId}" — has onboarding run yet?`,
      });
      return;
    }

    res.status(200).json(toDefaultPaletteResponse(basePalette));
  }

  return { onboardDeveloper, getDefaultPalette };
}
