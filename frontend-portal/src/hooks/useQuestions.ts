import { useEffect, useState } from "react";

const QUESTIONS_ENDPOINT = "http://localhost:3000/questions";

export interface Question {
  id: string;
  text: string;
  options: string[];
}

export interface QuestionsData {
  core_questions: Question[];
  deep_dive_questions: Question[];
}

/** Fetches the canonical 15-question set once per mount. Each consumer
 * fetches its own copy rather than sharing via context — cheap (one small
 * JSON GET), and there are only two consumers today. */
export function useQuestions() {
  const [questions, setQuestions] = useState<QuestionsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(QUESTIONS_ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load questions (status ${res.status})`);
        return res.json();
      })
      .then((data: QuestionsData) => setQuestions(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load questions."));
  }, []);

  return { questions, error };
}
