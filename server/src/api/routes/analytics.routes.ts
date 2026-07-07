import { Router } from "express";

import type { BasePalette } from "../../types/basePalette.types";
import type { AiProvider } from "../../services/ai/aiClient";
import { AiGenerationError } from "../../services/ai/aiClient";
import type { SubmissionsRepository } from "../../repositories/submissionsRepository";
import { computeSubmissionStats } from "../../services/submissions/submissionsService";

/**
 * Minimal shape this route needs from the concrete repositories —
 * deliberately not the full BasePaletteRepository/PersonalizedPaletteRepository
 * interfaces, since count()/getStats() are analytics-only conveniences, not
 * part of the real repository contract every backing store must implement.
 */
interface AnalyticsSources {
  basePaletteRepository: {
    count(): Promise<number>;
    findByDeveloper(developerId: string): Promise<BasePalette | null>;
  };
  personalizedPaletteRepository: {
    getStats(): Promise<{ totalGenerations: number; uniqueUsers: number; repeatUsers: number }>;
    deleteByUserIds(userIds: string[]): Promise<void>;
  };
  userAnswersRepository: {
    deleteByUserIds(userIds: string[]): Promise<void>;
  };
  submissionsRepository: SubmissionsRepository;
  aiProvider: AiProvider;
}

/**
 * Every number here is honestly computed from the database — no
 * placeholder/fabricated stats. "Personalization Rate" and "Retention" use
 * the labels the dashboard asks for, but are precisely defined in the
 * response so they aren't mistaken for a more sophisticated product-analytics
 * pipeline than this actually is.
 */
export function createAnalyticsRouter(sources: AnalyticsSources): Router {
  const router = Router();

  router.get("/analytics", async (_req, res) => {
    const appsOnboarded = await sources.basePaletteRepository.count();
    const { totalGenerations, uniqueUsers, repeatUsers } =
      await sources.personalizedPaletteRepository.getStats();

    const personalizationRate = appsOnboarded > 0 ? totalGenerations / appsOnboarded : 0;
    const retentionRate = uniqueUsers > 0 ? repeatUsers / uniqueUsers : 0;

    res.status(200).json({
      apps_onboarded: appsOnboarded,
      total_personalizations: totalGenerations,
      unique_users: uniqueUsers,
      personalization_rate: {
        value: personalizationRate,
        definition: "Personalized palettes generated per onboarded app this session.",
      },
      retention_rate: {
        value: retentionRate,
        definition: "Share of users who requested more than one personalization this session.",
      },
      ai_mode: process.env.NODE_ENV === "production" ? "live" : "mock",
    });
  });

  // One row per completed questionnaire (Simulator, Prompt Tuning, and the
  // real SDK all funnel through the same personalization call) — the
  // dashboard's submissions table and pie charts render straight off this.
  router.get("/analytics/submissions", async (req, res) => {
    const developerId = typeof req.query.developerId === "string" ? req.query.developerId : undefined;
    const submissions = await sources.submissionsRepository.getRecent(developerId);
    res.status(200).json({ submissions });
  });

  // Dashboard's per-row trash button — removes one submission, plus its
  // underlying personalized-palette generation and saved answers, so the
  // KPI tiles above (which read those other two collections) stay in sync
  // with what's actually left in the table.
  router.delete("/analytics/submissions/:submissionId", async (req, res) => {
    const deleted = await sources.submissionsRepository.delete(req.params.submissionId);
    if (deleted) {
      await Promise.all([
        sources.personalizedPaletteRepository.deleteByUserIds([deleted.user_id]),
        sources.userAnswersRepository.deleteByUserIds([deleted.user_id]),
      ]);
    }
    res.status(204).send();
  });

  // Dashboard's "Clear all" button — wipes every submission recorded for
  // this developer, plus their personalized-palette generations and saved
  // answers. Scoped to developerId (required) so clearing one developer's
  // test data can't touch another developer's submissions.
  router.delete("/analytics/submissions", async (req, res) => {
    const developerId = typeof req.query.developerId === "string" ? req.query.developerId : undefined;
    if (!developerId) {
      res.status(400).json({ error: "MissingDeveloperId", message: "developerId query param is required." });
      return;
    }
    const deleted = await sources.submissionsRepository.deleteAll(developerId);
    const userIds = deleted.map((s) => s.user_id);
    await Promise.all([
      sources.personalizedPaletteRepository.deleteByUserIds(userIds),
      sources.userAnswersRepository.deleteByUserIds(userIds),
    ]);
    res.status(204).send();
  });

  // AI-generated "who is this app for, and what does it provide" analysis,
  // grounded in the requesting developer's own app metadata plus aggregated
  // stats over their submissions so far.
  router.get("/analytics/audience-insight", async (req, res) => {
    const developerId = typeof req.query.developerId === "string" ? req.query.developerId : undefined;
    if (!developerId) {
      res.status(400).json({ error: "MissingDeveloperId", message: "developerId query param is required." });
      return;
    }

    const basePalette = await sources.basePaletteRepository.findByDeveloper(developerId);
    if (!basePalette) {
      res.status(404).json({
        error: "BasePaletteNotFound",
        message: `No BasePalette found for developer "${developerId}" — onboard an app first.`,
      });
      return;
    }

    const stats = computeSubmissionStats(await sources.submissionsRepository.getRecent(developerId));

    try {
      const insight = await sources.aiProvider.generateAudienceInsight({
        appMetadata: basePalette.app_metadata,
        submissionStats: stats,
      });
      res.status(200).json({ ...insight, stats, generated_at: new Date().toISOString() });
    } catch (err) {
      if (err instanceof AiGenerationError) {
        res.status(503).json({
          error: "AiGenerationFailed",
          message: "Audience insight generation is temporarily unavailable. Please retry shortly.",
        });
        return;
      }
      res.status(500).json({
        error: "InternalError",
        message: "An unexpected error occurred while generating the audience insight.",
      });
    }
  });

  return router;
}
