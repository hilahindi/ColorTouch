import { useEffect, useState } from "react";

const INSIGHT_ENDPOINT = "http://localhost:3000/analytics/audience-insight";

// Must match AppConfigPage's DEVELOPER_ID — the insight is scoped to the
// developer whose app metadata and submissions are being analyzed.
const DEVELOPER_ID = "faf06954-d9cb-4c66-a664-5de881a7b7bf";

interface AudienceInsight {
  target_audience: string;
  value_proposition: string;
  generated_at: string;
  stats: {
    total_submissions: number;
  };
}

type Status = "loading" | "done" | "error";

/**
 * AI-generated "who is this app for, and what does it provide" analysis,
 * grounded in the developer's app metadata plus aggregated stats over every
 * questionnaire submission recorded this session.
 */
export default function AudienceInsightCard() {
  const [insight, setInsight] = useState<AudienceInsight | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  function load() {
    setStatus("loading");
    setError(null);
    fetch(`${INSIGHT_ENDPOINT}?developerId=${DEVELOPER_ID}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message ?? `Request failed with status ${res.status}`);
        return body as AudienceInsight;
      })
      .then((data) => {
        setInsight(data);
        setStatus("done");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load audience insight.");
        setStatus("error");
      });
  }

  useEffect(load, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Audience Insight</h2>
          <p className="mt-1 text-sm text-slate-500">
            AI analysis of who this app's end users are and what the app provides, grounded in
            {insight ? ` ${insight.stats.total_submissions} submission(s)` : " this session's submissions"}
            .
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={status === "loading"}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin"
            />
          )}
          {status === "loading" ? "Analyzing…" : "Regenerate"}
        </button>
      </div>

      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {status === "loading" && !insight && (
        <p className="text-sm text-slate-400">Analyzing submissions…</p>
      )}

      {insight && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Target Audience
            </h3>
            <p className="text-sm leading-relaxed text-slate-700">{insight.target_audience}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              What This App Provides
            </h3>
            <p className="text-sm leading-relaxed text-slate-700">{insight.value_proposition}</p>
          </div>
        </div>
      )}
    </div>
  );
}
