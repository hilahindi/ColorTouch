import type { Request, Response, NextFunction } from "express";

import { validateAppMetadata, SchemaValidationError } from "../../validation/schemaValidator";

/**
 * Rejects a request with 400 unless req.body.appMetadata matches the
 * AppMetadata schema — runs before the onboarding controller so a malformed
 * developer questionnaire payload never reaches the AI layer.
 */
export function validateAppMetadataMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    validateAppMetadata((req.body as Record<string, unknown> | undefined)?.appMetadata);
    next();
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      res.status(400).json({
        error: "InvalidAppMetadata",
        message: err.message,
      });
      return;
    }
    next(err);
  }
}
