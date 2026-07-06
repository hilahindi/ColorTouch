import { Router } from "express";

import { getRecentLogs } from "../../services/logs/logsService";

export function createLogsRouter(): Router {
  const router = Router();

  router.get("/logs", (_req, res) => {
    res.status(200).json({ logs: getRecentLogs() });
  });

  return router;
}
