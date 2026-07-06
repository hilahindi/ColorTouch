import { Router } from "express";

/**
 * Minimal shape this route needs from the concrete in-memory repositories —
 * deliberately not the BasePaletteRepository/PersonalizedPaletteRepository
 * interfaces, since count()/getStats() are analytics-only conveniences
 * specific to this in-memory MVP stage, not part of the real repository
 * contract every backing store must implement.
 */
interface AnalyticsSources {
  basePaletteRepository: { count(): number };
  personalizedPaletteRepository: {
    getStats(): { totalGenerations: number; uniqueUsers: number; repeatUsers: number };
  };
}

/**
 * Every number here is honestly computed from real in-memory state — no
 * placeholder/fabricated stats. "Personalization Rate" and "Retention" use
 * the labels the dashboard asks for, but are precisely defined in the
 * response so they aren't mistaken for a real product-analytics pipeline:
 * this resets on every server restart and only reflects this process's data.
 */
export function createAnalyticsRouter(sources: AnalyticsSources): Router {
  const router = Router();

  router.get("/analytics", (_req, res) => {
    const appsOnboarded = sources.basePaletteRepository.count();
    const { totalGenerations, uniqueUsers, repeatUsers } =
      sources.personalizedPaletteRepository.getStats();

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

  return router;
}
