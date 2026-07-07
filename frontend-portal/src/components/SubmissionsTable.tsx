import { Fragment, useState } from "react";
import PalettePreview from "./PalettePreview";
import type { ColorModes } from "./PalettePreview";
import type { QuestionsData } from "../hooks/useQuestions";

export interface SubmissionResponseEntry {
  question_id: string;
  question: string;
  answer: string;
}

export interface Submission {
  submission_id: string;
  user_id: string;
  developer_id: string;
  submitted_at: string;
  responses: SubmissionResponseEntry[];
  palette: {
    colors: ColorModes;
    persona_label: string;
    confidence_score: number;
    traits: string[];
    segment?: string;
    mutation_reason: string;
  };
}

// Short column headers for the 5 core questions — the full question text
// (Hebrew, sentence-length) rides along as a title tooltip instead, so the
// table stays scannable at a glance.
const CORE_COLUMN_LABELS: Record<string, string> = {
  age_range: "Age",
  usage_hours: "Usage Hours",
  reading_style: "Reading Style",
  desired_feeling: "Desired Feeling",
  visual_mode_preference: "Visual Mode",
};

function ExpandedRow({ submission, colSpan }: { submission: Submission; colSpan: number }) {
  return (
    <tr className="border-t border-slate-100 bg-slate-50">
      <td colSpan={colSpan} className="px-5 py-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                All Responses ({submission.responses.length})
              </h4>
              <dl className="space-y-1.5">
                {submission.responses.map((r) => (
                  <div key={r.question_id} className="text-xs">
                    <dt className="text-slate-400">{r.question}</dt>
                    <dd className="font-medium text-slate-700">{r.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                AI Reasoning
              </h4>
              <p className="text-xs leading-relaxed text-slate-700">{submission.palette.mutation_reason}</p>
            </div>
          </div>
          <div>
            <PalettePreview
              palette={{ colors: submission.palette.colors }}
              title={`${submission.palette.persona_label} — Personalized Palette`}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

/**
 * One row per completed questionnaire submission: core-question answers as
 * columns, the AI's design rationale (bi_insights.mutation_reason) as the
 * last column, and an expandable detail panel with every answer plus the
 * full light/dark palette (the same PalettePreview used in App Configuration).
 */
export default function SubmissionsTable({
  submissions,
  questions,
  onDelete,
}: {
  submissions: Submission[];
  questions: QuestionsData | null;
  onDelete: (submissionId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const coreQuestions = questions?.core_questions ?? [];
  const colSpan = coreQuestions.length + 6;

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400 shadow-sm">
        No questionnaire submissions recorded yet this session.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Submitted</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Respondent</th>
              {coreQuestions.map((q) => (
                <th key={q.id} title={q.text} className="whitespace-nowrap px-4 py-2.5 font-medium">
                  {CORE_COLUMN_LABELS[q.id] ?? q.id}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Persona</th>
              <th className="min-w-[8rem] px-4 py-2.5 font-medium">Palette</th>
              <th className="min-w-[20rem] px-4 py-2.5 font-medium">AI Reasoning</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, index) => {
              const answerByQuestionId = new Map(s.responses.map((r) => [r.question_id, r.answer]));
              const isExpanded = expandedId === s.submission_id;
              // Submissions arrive newest-first; number them in submission
              // order (oldest = Respondent 1) since the raw user_id is just
              // a random per-submission UUID with no human meaning.
              const respondentNumber = submissions.length - index;
              return (
                <Fragment key={s.submission_id}>
                  <tr className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                      {new Date(s.submitted_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                      Respondent {respondentNumber}
                    </td>
                    {coreQuestions.map((q) => (
                      <td key={q.id} className="min-w-[11rem] max-w-[14rem] px-4 py-3 text-xs text-slate-700">
                        {answerByQuestionId.get(q.id) ?? "—"}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {s.palette.persona_label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : s.submission_id)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <span className="flex gap-0.5" aria-hidden="true">
                          {(["primary", "secondary", "tertiary"] as const).map((role) => (
                            <span
                              key={role}
                              className="h-3 w-3 rounded-full ring-1 ring-black/10"
                              style={{ backgroundColor: s.palette.colors.light[role] }}
                            />
                          ))}
                        </span>
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    </td>
                    <td className="min-w-[20rem] max-w-[26rem] px-4 py-3 text-xs leading-relaxed text-slate-600">
                      <span className="line-clamp-4">{s.palette.mutation_reason}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete Respondent ${respondentNumber}'s submission?`)) {
                            onDelete(s.submission_id);
                          }
                        }}
                        title="Delete submission"
                        aria-label="Delete submission"
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                  {isExpanded && <ExpandedRow submission={s} colSpan={colSpan} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
