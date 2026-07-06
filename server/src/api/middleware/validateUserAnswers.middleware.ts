import type { Request, Response, NextFunction } from "express";

import { validateUserAnswers, SchemaValidationError } from "../../validation/schemaValidator";

/**
 * Rejects a request with 400 unless req.body.userAnswers matches the
 * UserAnswers schema — runs before the controller so a malformed SDK
 * payload never reaches the service/AI layer.
 */
export function validateUserAnswersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    validateUserAnswers((req.body as Record<string, unknown> | undefined)?.userAnswers);
    next();
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      res.status(400).json({
        error: "InvalidUserAnswers",
        message: err.message,
      });
      return;
    }
    next(err);
  }
}
