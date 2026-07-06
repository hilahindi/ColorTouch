import type { Question, QuestionsData } from "../hooks/useQuestions";

interface QuestionnaireWizardProps {
  questions: QuestionsData | null;
  questionsError: string | null;
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
  showDeepDive: boolean;
  onShowDeepDive: () => void;
  disabled?: boolean;
}

function QuestionBlock({
  question,
  selectedAnswer,
  onSelect,
  disabled,
}: {
  question: Question;
  selectedAnswer: string | undefined;
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="mb-2 text-sm font-medium text-slate-700">{question.text}</p>
      <div className="space-y-1.5">
        {question.options.map((option) => {
          const checked = selectedAnswer === option;
          return (
            <label
              key={option}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${
                checked
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                checked={checked}
                disabled={disabled}
                onChange={() => onSelect(option)}
                className="h-3.5 w-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
              />
              {option}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Reusable 15-question wizard (5 core + 10 optional deep-dive), controlled
 * by the parent — used by both the Personalization Simulator and Prompt
 * Tuning pages so the two don't drift into separately-maintained copies. */
export default function QuestionnaireWizard({
  questions,
  questionsError,
  answers,
  onAnswer,
  showDeepDive,
  onShowDeepDive,
  disabled = false,
}: QuestionnaireWizardProps) {
  if (questionsError) {
    return <p className="py-4 text-sm text-red-600">{questionsError}</p>;
  }

  if (!questions) {
    return <p className="py-4 text-sm text-slate-400">Loading questions…</p>;
  }

  const coreAnsweredCount = questions.core_questions.filter((q) => answers[q.id]).length;
  const allCoreAnswered = coreAnsweredCount === questions.core_questions.length;

  return (
    <>
      <p className="mb-1 text-[11px] text-slate-400">
        {coreAnsweredCount}/{questions.core_questions.length} core questions answered
      </p>

      {questions.core_questions.map((q) => (
        <QuestionBlock
          key={q.id}
          question={q}
          selectedAnswer={answers[q.id]}
          onSelect={(value) => onAnswer(q.id, value)}
          disabled={disabled}
        />
      ))}

      {!showDeepDive ? (
        <button
          type="button"
          onClick={onShowDeepDive}
          disabled={!allCoreAnswered || disabled}
          className="mt-3 w-full rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + 10 optional deep-dive questions
        </button>
      ) : (
        questions.deep_dive_questions.map((q) => (
          <QuestionBlock
            key={q.id}
            question={q}
            selectedAnswer={answers[q.id]}
            onSelect={(value) => onAnswer(q.id, value)}
            disabled={disabled}
          />
        ))
      )}
    </>
  );
}

export function isWizardReady(questions: QuestionsData | null, answers: Record<string, string>): boolean {
  if (!questions) return false;
  return questions.core_questions.every((q) => answers[q.id]);
}

export function toQuestionResponses(answers: Record<string, string>) {
  return Object.entries(answers).map(([question_id, answer_value]) => ({ question_id, answer_value }));
}
