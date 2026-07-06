import type { BasePalette } from "../types/basePalette.types";

/**
 * DB-backed lookup for a developer's current BasePalette. One BasePalette
 * per developer for the MVP — no concrete implementation exists yet in this
 * codebase — wire this to whatever store (Postgres, Mongo, ...) the project
 * settles on, matching the pattern set by AiProvider/GroqAiProvider
 * (interface here, adapter elsewhere).
 */
export interface BasePaletteRepository {
  findByDeveloper(developerId: string): Promise<BasePalette | null>;
  save(basePalette: BasePalette): Promise<void>;
}
