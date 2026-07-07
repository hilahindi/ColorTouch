import type { Collection } from "mongodb";
import type { Db } from "mongodb";

import type { BasePaletteRepository } from "./basePaletteRepository";
import type { BasePalette } from "../types/basePalette.types";

// Mongo requires an _id; developer_id is the natural key (one BasePalette
// per developer for this MVP, same constraint the in-memory Map enforced).
type BasePaletteDoc = BasePalette & { _id: string };

export class MongoBasePaletteRepository implements BasePaletteRepository {
  private readonly collection: Collection<BasePaletteDoc>;

  constructor(db: Db) {
    this.collection = db.collection<BasePaletteDoc>("base_palettes");
  }

  async findByDeveloper(developerId: string): Promise<BasePalette | null> {
    const doc = await this.collection.findOne({ _id: developerId });
    if (!doc) return null;
    const { _id, ...basePalette } = doc;
    return basePalette;
  }

  async save(basePalette: BasePalette): Promise<void> {
    // Equality filter on _id: MongoDB carries the filter's _id over to the
    // inserted document on upsert, so it doesn't need to be repeated here
    // (and the driver's replaceOne types disallow it in the replacement).
    await this.collection.replaceOne(
      { _id: basePalette.developer_id },
      basePalette,
      { upsert: true },
    );
  }

  // Not part of BasePaletteRepository — analytics-only convenience, mirrors
  // the in-memory implementation this replaces.
  async count(): Promise<number> {
    return this.collection.countDocuments();
  }
}
