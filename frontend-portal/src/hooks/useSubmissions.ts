import { useEffect, useState } from "react";
import type { Submission } from "../components/SubmissionsTable";

const SUBMISSIONS_ENDPOINT = "http://localhost:3000/analytics/submissions";

// Must match AppConfigPage's DEVELOPER_ID.
const DEVELOPER_ID = "11111111-1111-1111-1111-111111111111";

/** Fetches this developer's questionnaire submissions once per mount — the
 * dashboard remounts this on every navigation back to it, so that's enough
 * to reflect submissions generated elsewhere (Simulator, Prompt Tuning). */
export function useSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SUBMISSIONS_ENDPOINT}?developerId=${DEVELOPER_ID}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load submissions (status ${res.status})`);
        return res.json();
      })
      .then((data: { submissions: Submission[] }) => setSubmissions(data.submissions))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load submissions."))
      .finally(() => setLoading(false));
  }, []);

  return { submissions, error, loading };
}
