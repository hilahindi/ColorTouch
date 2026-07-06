import { Router } from "express";
import type { Request, Response, NextFunction, RequestHandler } from "express";

import { requireFields } from "../middleware/requireFields.middleware";
import { validateAppMetadataMiddleware } from "../middleware/validateAppMetadata.middleware";
import type { createOnboardingController } from "../controllers/onboarding.controller";

type OnboardingController = ReturnType<typeof createOnboardingController>;

// Express doesn't await async route handlers — a rejected promise would
// otherwise hang the request instead of reaching error handling.
function asyncHandler(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

/**
 * Exposes OnboardingService.onboardDeveloper to the SDK/dashboard over HTTP.
 * developerId and appMetadata both travel in the request body.
 */
export function createOnboardingRouter(controller: OnboardingController): Router {
  const router = Router();

  router.post(
    "/developer/onboarding",
    requireFields(["developerId"]),
    validateAppMetadataMiddleware,
    asyncHandler(controller.onboardDeveloper)
  );

  router.get(
    "/developer/:developerId/base-palette",
    asyncHandler(controller.getDefaultPalette)
  );

  return router;
}
