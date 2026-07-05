import type { ColorModes } from "./colorScheme.types";

export type AnimationSpeed = "slow" | "normal" | "fast" | "reduced_motion";
export type ContrastLevel = "low" | "normal" | "high";
export type ElevationStyle = "flat" | "shadowed";

export interface UiBehavior {
  /** Concrete dp value — feeds directly into RoundedCornerShape(x.dp), no mapping step. */
  border_radius_dp: number;
  animation_speed: AnimationSpeed;
  contrast_level: ContrastLevel;
  elevation_style: ElevationStyle;
}

export interface BiInsights {
  persona_label: string;
  /** 0–1. Must reflect genuine certainty, not a fixed default. */
  confidence_score: number;
  traits: string[];
  segment?: string;
}

export interface CacheControl {
  ttl_seconds?: number;
}

export interface PersonalizedPalette {
  schema_version: "1.0";
  palette_id: string;
  base_palette_id: string;
  /**
   * Snapshot of BasePalette.version at generation time. Compare against the
   * developer's current BasePalette.version to detect staleness before serving
   * a cached value — see the cache-invalidation strategy in the server design.
   */
  base_palette_version: number;
  user_id: string;
  colors: ColorModes;
  ui_behavior: UiBehavior;
  bi_insights: BiInsights;
  generated_at: string;
  cache_control?: CacheControl;
}
