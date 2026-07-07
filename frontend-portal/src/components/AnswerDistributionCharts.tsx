import DonutChart from "./DonutChart";
import type { Submission } from "./SubmissionsTable";
import type { QuestionsData } from "../hooks/useQuestions";

/**
 * One donut per core question (age included), each showing how this
 * session's submissions split across that question's answer options —
 * "for every answer, what's the distribution of people (and ages)".
 */
export default function AnswerDistributionCharts({
  submissions,
  questions,
}: {
  submissions: Submission[];
  questions: QuestionsData | null;
}) {
  const coreQuestions = questions?.core_questions ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {coreQuestions.map((q) => {
        const counts = new Map<string, number>();
        for (const option of q.options) counts.set(option, 0);
        for (const submission of submissions) {
          const answer = submission.responses.find((r) => r.question_id === q.id)?.answer;
          if (answer !== undefined) counts.set(answer, (counts.get(answer) ?? 0) + 1);
        }

        return (
          <DonutChart
            key={q.id}
            title={q.text}
            data={[...counts.entries()].map(([label, value]) => ({ label, value }))}
          />
        );
      })}
    </div>
  );
}
