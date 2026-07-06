import type { Request, Response, NextFunction } from "express";

import { validateUserAnswers, SchemaValidationError } from "../../validation/schemaValidator";
import {
  validateQuestionnaireResponses,
  QuestionnaireValidationError,
} from "../../services/questions/questionsService";

/**
 * Rejects a request with 400 unless req.body.userAnswers matches the
 * UserAnswers schema AND satisfies the questionnaire business rules (known
 * question_ids, all 5 core questions answered) — runs before the controller
 * so a malformed or incomplete SDK payload never reaches the service/AI layer.
 */
export function validateUserAnswersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userAnswers = (req.body as Record<string, unknown> | undefined)?.userAnswers;

  try {
    validateUserAnswers(userAnswers);
    validateQuestionnaireResponses(userAnswers);
    next();
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      res.status(400).json({
        error: "InvalidUserAnswers",
        message: err.message,
      });
      return;
    }
    if (err instanceof QuestionnaireValidationError) {
      res.status(400).json({
        error: "IncompleteQuestionnaire",
        message: err.message,
      });
      return;
    }
    next(err);
  }
}
