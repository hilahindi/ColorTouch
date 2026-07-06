import type { PersonalizedPalette } from "../types/personalizedPalette.types";

/**
 * Redis-backed cache for a user's most recently generated PersonalizedPalette.
 * Keyed by userId alone — staleness isn't a cache-key concern, it's decided
 * by the caller comparing the returned palette's base_palette_id/version
 * against the current BasePalette (see PersonalizedPalette.base_palette_version
 * doc comment in ../types/personalizedPalette.types.ts).
 */
export interface PersonalizedPaletteCache {
  get(userId: string): Promise<PersonalizedPalette | null>;
  set(userId: string, palette: PersonalizedPalette, ttlSeconds?: number): Promise<void>;
}
