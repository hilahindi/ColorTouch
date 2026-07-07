import type { ColorModes } from "../../types/colorScheme.types";
import type { QuestionnaireContextEntry } from "../questions/questionsService";

export interface SubmissionRecord {
  submission_id: string;
  user_id: string;
  developer_id: string;
  submitted_at: string;
  responses: QuestionnaireContextEntry[];
  palette: {
    colors: ColorModes;
    persona_label: string;
    confidence_score: number;
    traits: string[];
    segment?: string;
    mutation_reason: string;
  };
}

export interface SubmissionStats {
  total_submissions: number;
  age_distribution: Record<string, number>;
  persona_distribution: Record<string, number>;
  segment_distribution: Record<string, number>;
  top_traits: { trait: string; count: number }[];
}

function tally(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

/**
 * Aggregates a set of submissions into the shape the audience-insight AI call
 * (and the dashboard's pie charts) needs — counts only, never raw per-user
 * answers, since this is meant to summarize a population, not re-expose PII.
 * Pure function over whatever SubmissionsRepository.getRecent() returned —
 * storage lives in ../../repositories/mongoSubmissionsRepository.ts.
 */
export function computeSubmissionStats(records: SubmissionRecord[]): SubmissionStats {
  const ageAnswers = records
    .flatMap((r) => r.responses.filter((entry) => entry.question_id === AGE_QUESTION_ID))
    .map((entry) => entry.answer);

  const traitCounts = tally(records.flatMap((r) => r.palette.traits));
  const topTraits = Object.entries(traitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([trait, count]) => ({ trait, count }));

  return {
    total_submissions: records.length,
    age_distribution: tally(ageAnswers),
    persona_distribution: tally(records.map((r) => r.palette.persona_label)),
    segment_distribution: tally(
      records.map((r) => r.palette.segment).filter((s): s is string => Boolean(s)),
    ),
    top_traits: topTraits,
  };
}

// Matches questions.json's age question id.
const AGE_QUESTION_ID = "age_range";
