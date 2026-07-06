import type { Request, Response } from "express";

import type { createPersonalizedPaletteService } from "../../services/palette/personalizedPalette.service";
import { BasePaletteNotFoundError } from "../../services/palette/personalizedPalette.service";
import { AiGenerationError } from "../../services/ai/aiClient";
import { SchemaValidationError } from "../../validation/schemaValidator";
import type { UserAnswers } from "../../types/userAnswers.types";

type PersonalizedPaletteService = ReturnType<
  typeof createPersonalizedPaletteService
>;

interface PersonalizedPaletteRequestBody {
  developerId: string;
  userId: string;
  userAnswers: UserAnswers;
}

/**
 * Wires a PersonalizedPaletteService instance into an Express controller.
 * requireFields/validateUserAnswers middleware (see ../middleware) already
 * guaranteed the request shape by the time this runs — this layer only
 * maps service-level failures onto HTTP status codes the SDK can react to.
 */
export function createPersonalizationController(
  service: PersonalizedPaletteService,
) {
  async function getPersonalizedPalette(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { developerId, userId, userAnswers } =
      req.body as PersonalizedPaletteRequestBody;

    try {
      const palette = await service.getOrGeneratePersonalizedPalette(
        developerId,
        userId,
        userAnswers,
      );
      res.status(200).json(palette);
    } catch (err) {
      if (err instanceof BasePaletteNotFoundError) {
        res
          .status(404)
          .json({ error: "BasePaletteNotFound", message: err.message });
        return;
      }

      if (err instanceof AiGenerationError) {
        // 503, not 500: this isn't the caller's fault and may well succeed
        // on retry once the AI provider recovers — the SDK is expected to
        // fall back to its bundled default palette when it sees this status.
        res.status(503).json({
          error: "AiGenerationFailed",
          message:
            "Personalized palette generation is temporarily unavailable. Please retry shortly.",
        });
        return;
      }

      if (err instanceof SchemaValidationError) {
        // The service already validates before returning — reaching here
        // means the generated data was structurally invalid, a server bug
        // rather than a client or transient AI issue.
        res.status(500).json({
          error: "SchemaValidationFailed",
          message: "Generated palette failed internal validation.",
        });
        return;
      }

      res.status(500).json({
        error: "InternalError",
        message:
          "An unexpected error occurred while generating the personalized palette.",
      });
    }
  }

  return { getPersonalizedPalette };
}
