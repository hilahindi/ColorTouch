import { Router } from "express";
import type { Request, Response, NextFunction, RequestHandler } from "express";

import { requireFields } from "../middleware/requireFields.middleware";
import { validateUserAnswersMiddleware } from "../middleware/validateUserAnswers.middleware";
import type { createPersonalizationController } from "../controllers/personalization.controller";

type PersonalizationController = ReturnType<typeof createPersonalizationController>;

/**
 * Express doesn't await async route handlers — a rejected promise would
 * otherwise hang the request instead of reaching error handling. Wrapping
 * routes this file's own responsibility to fix, so it works for any handler
 * passed to createPersonalizationRouter.
 */
function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

/**
 * Exposes PersonalizedPaletteService.getOrGeneratePersonalizedPalette to the
 * SDK over HTTP. All three inputs travel in the request body — developerId/
 * userId as identifiers, userAnswers as the in-app questionnaire result.
 */
export function createPersonalizationRouter(controller: PersonalizationController): Router {
  const router = Router();

  router.post(
    "/personalized-palette",
    requireFields(["developerId", "userId"]),
    validateUserAnswersMiddleware,
    asyncHandler(controller.getPersonalizedPalette)
  );

  return router;
}
