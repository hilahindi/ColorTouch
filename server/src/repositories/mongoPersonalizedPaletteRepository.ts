import type { Collection, Db } from "mongodb";

import type { PersonalizedPaletteRepository } from "./personalizedPaletteRepository";
import type { PersonalizedPalette } from "../types/personalizedPalette.types";

type PersonalizedPaletteDoc = PersonalizedPalette & { _id: string };

export class MongoPersonalizedPaletteRepository implements PersonalizedPaletteRepository {
  private readonly collection: Collection<PersonalizedPaletteDoc>;

  constructor(db: Db) {
    this.collection = db.collection<PersonalizedPaletteDoc>("personalized_palettes");
  }

  async save(palette: PersonalizedPalette): Promise<void> {
    // Equality filter on _id: MongoDB carries the filter's _id over to the
    // inserted document on upsert (see mongoBasePaletteRepository.ts's save()).
    await this.collection.replaceOne(
      { _id: palette.palette_id },
      palette,
      { upsert: true },
    );
  }

  // Not part of PersonalizedPaletteRepository — analytics-only convenience,
  // mirrors the in-memory implementation this replaces. "Repeat" = a user_id
  // with more than one generation ever recorded (no session boundary here,
  // unlike the in-memory version — this is now real cross-session history).
  async getStats(): Promise<{
    totalGenerations: number;
    uniqueUsers: number;
    repeatUsers: number;
  }> {
    const [totalGenerations, [grouped]] = await Promise.all([
      this.collection.countDocuments(),
      this.collection
        .aggregate<{ uniqueUsers: number; repeatUsers: number }>([
          { $group: { _id: "$user_id", count: { $sum: 1 } } },
          {
            $group: {
              _id: null,
              uniqueUsers: { $sum: 1 },
              repeatUsers: { $sum: { $cond: [{ $gt: ["$count", 1] }, 1, 0] } },
            },
          },
        ])
        .toArray(),
    ]);

    return {
      totalGenerations,
      uniqueUsers: grouped?.uniqueUsers ?? 0,
      repeatUsers: grouped?.repeatUsers ?? 0,
    };
  }
}
