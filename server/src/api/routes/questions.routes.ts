import { Router } from "express";

import { getQuestionsData } from "../../services/questions/questionsService";

/**
 * Serves the canonical question set (server/src/data/questions.json) so
 * clients render from the same source of truth the server itself uses to
 * build prompts, instead of maintaining their own copy that can drift.
 */
export function createQuestionsRouter(): Router {
  const router = Router();

  router.get("/questions", (_req, res) => {
    res.status(200).json(getQuestionsData());
  });

  return router;
}
