import type { Request, Response } from "express";

import type { createOnboardingService } from "../../services/palette/onboarding.service";
import { AiGenerationError } from "../../services/ai/aiClient";
import { SchemaValidationError } from "../../validation/schemaValidator";
import type { AppMetadata } from "../../types/basePalette.types";

type OnboardingService = ReturnType<typeof createOnboardingService>;

interface OnboardingRequestBody {
  developerId: string;
  appMetadata: AppMetadata;
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

  return { onboardDeveloper };
}
