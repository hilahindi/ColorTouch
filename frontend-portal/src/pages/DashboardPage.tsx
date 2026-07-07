import { useEffect, useState } from "react";
import { useQuestions } from "../hooks/useQuestions";
import { useSubmissions } from "../hooks/useSubmissions";
import SubmissionsTable from "../components/SubmissionsTable";
import AnswerDistributionCharts from "../components/AnswerDistributionCharts";
import AudienceInsightCard from "../components/AudienceInsightCard";

const ANALYTICS_ENDPOINT = "http://localhost:3000/analytics";

interface AnalyticsMetric {
  value: number;
  definition: string;
}

interface AnalyticsData {
  apps_onboarded: number;
  total_personalizations: number;
  unique_users: number;
  personalization_rate: AnalyticsMetric;
  retention_rate: AnalyticsMetric;
  ai_mode: "mock" | "live";
}

function KpiTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {caption && <p className="mt-1.5 text-xs text-slate-400">{caption}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { questions } = useQuestions();
  const { submissions, error: submissionsError } = useSubmissions();

  useEffect(() => {
    fetch(ANALYTICS_ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load analytics (status ${res.status})`);
        return res.json();
      })
      .then((json: AnalyticsData) => setData(json))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analytics."));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-400">Loading analytics…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Apps Onboarded" value={String(data.apps_onboarded)} />
        <KpiTile label="Personalizations Generated" value={String(data.total_personalizations)} />
        <KpiTile label="Unique End Users" value={String(data.unique_users)} />
        <KpiTile
          label="AI Provider Mode"
          value={data.ai_mode === "live" ? "Live" : "Mock"}
          caption={data.ai_mode === "live" ? "Calling Groq" : "NODE_ENV !== production"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiTile
          label="Personalization Rate"
          value={`${(data.personalization_rate.value * 100).toFixed(0)}%`}
          caption={data.personalization_rate.definition}
        />
        <KpiTile
          label="Retention"
          value={`${(data.retention_rate.value * 100).toFixed(0)}%`}
          caption={data.retention_rate.definition}
        />
      </div>

      <p className="text-xs text-slate-400">
        All figures reflect this server process's in-memory state since it last started — they
        reset on restart and aren't backed by a persistent analytics pipeline yet.
      </p>

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">User Submissions</h2>
        {submissionsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submissionsError}
          </div>
        ) : (
          <SubmissionsTable submissions={submissions} questions={questions} />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Answer Distribution</h2>
        <AnswerDistributionCharts submissions={submissions} questions={questions} />
      </div>

      <AudienceInsightCard />
    </div>
  );
}
