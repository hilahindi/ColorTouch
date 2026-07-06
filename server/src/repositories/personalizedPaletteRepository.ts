import type { PersonalizedPalette } from "../types/personalizedPalette.types";

/**
 * DB-backed durable store for generated PersonalizedPalettes. Redis (see
 * ../cache/personalizedPaletteCache.ts) is the fast path for repeat reads;
 * this is the source of truth once the cache entry expires or is evicted.
 */
export interface PersonalizedPaletteRepository {
  save(palette: PersonalizedPalette): Promise<void>;
}
