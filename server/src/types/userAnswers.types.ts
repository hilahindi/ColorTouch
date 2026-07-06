export interface QuestionResponse {
  question_id: string;
  answer_value: string;
}

/**
 * End user's in-app questionnaire responses — a flexible list of
 * {question_id, answer_value} pairs rather than fixed named fields, since the
 * actual question set (see server/src/data/questions.json) is 5 mandatory +
 * 10 optional questions and can grow without a schema/type change here.
 * The 5 core question ids being present is enforced at runtime in
 * questionsService.ts, not by this type or by ajv — see the comment on
 * userAnswers.schema.json for why.
 */
export interface UserAnswers {
  user_id: string;
  responses: QuestionResponse[];
}
