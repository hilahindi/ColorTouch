import questionsData from "../../data/questions.json";
import type { UserAnswers } from "../../types/userAnswers.types";

export interface QuestionDefinition {
  id: string;
  text: string;
  options: string[];
}

export interface QuestionsFile {
  core_questions: QuestionDefinition[];
  deep_dive_questions: QuestionDefinition[];
}

// Cast, not runtime-validated — this file is authored by hand, not
// user-supplied input, so it doesn't go through ajv like request bodies do.
const questions = questionsData as QuestionsFile;

/**
 * The raw question set (5 core + 10 deep-dive), for the GET /questions
 * endpoint — the single source of truth every client (web debug view,
 * Android's bundled asset copy) should render from, rather than each
 * maintaining its own copy of questions.json.
 */
export function getQuestionsData(): QuestionsFile {
  return questions;
}

const ALL_QUESTIONS: QuestionDefinition[] = [
  ...questions.core_questions,
  ...questions.deep_dive_questions,
];

const QUESTIONS_BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

const MANDATORY_QUESTION_IDS = questions.core_questions.map((q) => q.id);

export class QuestionnaireValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionnaireValidationError";
  }
}

/**
 * Throws if any response references a question_id not found in
 * questions.json, or if any of the 5 core (mandatory) questions is missing.
 * ajv (userAnswers.schema.json) only checks the generic {question_id,
 * answer_value}[] shape — this is the business-rule check on top of that.
 */
export function validateQuestionnaireResponses(userAnswers: UserAnswers): void {
  const answeredIds = new Set(userAnswers.responses.map((r) => r.question_id));

  const unknownIds = [...answeredIds].filter((id) => !QUESTIONS_BY_ID.has(id));
  if (unknownIds.length > 0) {
    throw new QuestionnaireValidationError(`Unknown question_id(s): ${unknownIds.join(", ")}`);
  }

  const missingMandatory = MANDATORY_QUESTION_IDS.filter((id) => !answeredIds.has(id));
  if (missingMandatory.length > 0) {
    throw new QuestionnaireValidationError(
      `Missing required question(s): ${missingMandatory.join(", ")}`
    );
  }
}

export interface QuestionnaireContextEntry {
  question_id: string;
  question: string;
  answer: string;
}

/**
 * Resolves each response's question_id to its original question text from
 * questions.json. The raw {question_id, answer_value} pairs alone don't give
 * the model enough context — "age_range: 25-34" is opaque, "What's your age
 * range? -> 25-34" is what actually informs a color/tone decision. question_id
 * is kept alongside the resolved text so downstream consumers (e.g. the
 * submissions dashboard) can key off a stable id instead of matching on
 * question text.
 */
export function buildQuestionnaireContext(userAnswers: UserAnswers): QuestionnaireContextEntry[] {
  const entries: QuestionnaireContextEntry[] = [];

  for (const response of userAnswers.responses) {
    const question = QUESTIONS_BY_ID.get(response.question_id);
    if (!question) continue; // already rejected by validateQuestionnaireResponses upstream
    entries.push({ question_id: question.id, question: question.text, answer: response.answer_value });
  }

  return entries;
}
