import type { UserAnswers } from "../types/userAnswers.types";

/**
 * DB-backed persistence for a user's in-app questionnaire answers.
 * The caller always holds the current answers already (e.g. from the request
 * body) — this repository is for writing them to the DB as the record of
 * what was last submitted, not for reading them back within the same call.
 */
export interface UserAnswersRepository {
  save(userAnswers: UserAnswers): Promise<void>;
}
