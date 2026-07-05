import type { ColorModes } from "./colorScheme.types";

export type AppCategory =
  | "fintech"
  | "ecommerce"
  | "health_fitness"
  | "social"
  | "productivity"
  | "gaming"
  | "education"
  | "travel"
  | "food"
  | "other";

export type Kpi =
  | "engagement"
  | "retention"
  | "conversion"
  | "session_length"
  | "onboarding_completion";

export interface AppMetadata {
  category: AppCategory;
  personality_tags: string[];
  kpis: Kpi[];
}

export interface AiMeta {
  model?: string;
  reasoning_summary?: string;
}

export interface BasePalette {
  schema_version: "1.0";
  palette_id: string;
  developer_id: string;
  /** Monotonically increasing per developer_id — bumped on every re-generation. */
  version: number;
  app_metadata: AppMetadata;
  colors: ColorModes;
  generated_at: string;
  ai_meta?: AiMeta;
}
