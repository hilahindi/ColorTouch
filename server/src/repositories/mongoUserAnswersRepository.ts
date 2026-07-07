import type { Collection, Db } from "mongodb";

import type { UserAnswersRepository } from "./userAnswersRepository";
import type { UserAnswers } from "../types/userAnswers.types";

type UserAnswersDoc = UserAnswers & { _id: string };

export class MongoUserAnswersRepository implements UserAnswersRepository {
  private readonly collection: Collection<UserAnswersDoc>;

  constructor(db: Db) {
    this.collection = db.collection<UserAnswersDoc>("user_answers");
  }

  async save(userAnswers: UserAnswers): Promise<void> {
    // Equality filter on _id: MongoDB carries the filter's _id over to the
    // inserted document on upsert (see mongoBasePaletteRepository.ts's save()).
    await this.collection.replaceOne(
      { _id: userAnswers.user_id },
      userAnswers,
      { upsert: true },
    );
  }
}
