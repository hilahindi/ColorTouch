import type { Request, Response, NextFunction } from "express";

/**
 * Rejects a request with 400 unless every named field is present as a
 * non-empty string in req.body. Used for the SDK-facing identifiers
 * (developerId, userId) that every personalization request must carry.
 */
export function requireFields(fields: string[]) {
  return function requireFieldsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const missing = fields.filter((field) => {
      const value = (req.body as Record<string, unknown> | undefined)?.[field];
      return typeof value !== "string" || value.trim().length === 0;
    });

    if (missing.length > 0) {
      res.status(400).json({
        error: "MissingRequiredFields",
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
      return;
    }

    next();
  };
}
