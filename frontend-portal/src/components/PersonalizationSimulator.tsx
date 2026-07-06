import { useState } from "react";
import { useQuestions } from "../hooks/useQuestions";
import QuestionnaireWizard, { isWizardReady, toQuestionResponses } from "./QuestionnaireWizard";

const PERSONALIZATION_ENDPOINT = "http://localhost:3000/personalized-palette";

// Must match AppConfigPage's DEVELOPER_ID — the personalization endpoint
// looks up the base palette by developerId, so this only works against the
// developer that was just onboarded in this session.
const DEVELOPER_ID = "11111111-1111-1111-1111-111111111111";

interface AiPromptDebug {
  system: string;
  user: string;
}

interface SimResponse {
  status: number;
  body: unknown;
}

// A fixed, schema-shaped PersonalizedPalette for "Mock Mode" — no network
// call happens when this is shown. Same Material Design 3 baseline tokens
// (seed color #6750A4) used in this project's other mock fixtures.
const MOCK_PALETTE_RESPONSE = {
  schema_version: "1.0",
  palette_id: "mock-0000-0000-0000-000000000000",
  base_palette_id: "mock-0000-0000-0000-000000000000",
  base_palette_version: 1,
  user_id: "mock-user",
  colors: {
    light: {
      primary: "#6750A4",
      onPrimary: "#FFFFFF",
      primaryContainer: "#EADDFF",
      background: "#FFFBFE",
      surface: "#FFFBFE",
      onSurface: "#1C1B1F",
      error: "#B3261E",
    },
    dark: {
      primary: "#D0BCFF",
      onPrimary: "#381E72",
      primaryContainer: "#4F378B",
      background: "#1C1B1F",
      surface: "#1C1B1F",
      onSurface: "#E6E1E5",
      error: "#F2B8B5",
    },
  },
  ui_behavior: {
    border_radius_dp: 16,
    animation_speed: "normal",
    contrast_level: "normal",
    elevation_style: "shadowed",
  },
  bi_insights: {
    persona_label: "Mock Persona",
    confidence_score: 0.9,
    traits: ["mock", "predefined"],
    mutation_reason: "This is a predefined mock response — Mock Mode is ON, no request was sent to Groq.",
  },
  generated_at: "2026-01-01T00:00:00.000Z",
};

export default function PersonalizationSimulator() {
  const { questions, error: questionsError } = useQuestions();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [aiRequest, setAiRequest] = useState<AiPromptDebug | null>(null);
  const [aiResponse, setAiResponse] = useState<SimResponse | null>(null);

  const isLoading = status === "loading";
  const ready = isWizardReady(questions, answers);

  async function handleSimulate() {
    setStatus("loading");
    setAiRequest(null);
    setAiResponse(null);

    const responses = toQuestionResponses(answers);
    const userId = crypto.randomUUID();

    if (mockMode) {
      // Artificial delay so the loading state is actually visible/testable —
      // no network call happens here at all.
      await new Promise((resolve) => setTimeout(resolve, 300));
      setAiResponse({ status: 200, body: MOCK_PALETTE_RESPONSE });
      setStatus("done");
      return;
    }

    try {
      const response = await fetch(PERSONALIZATION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerId: DEVELOPER_ID,
          userId,
          debug: true,
          userAnswers: { user_id: userId, responses },
        }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "ParseError", message: "Response body was not valid JSON." }));

      setAiRequest((body as { debug?: { prompt?: AiPromptDebug } })?.debug?.prompt ?? null);
      setAiResponse({ status: response.status, body });
    } catch (err) {
      setAiResponse({
        status: 0,
        body: {
          error: "NetworkError",
          message: err instanceof Error ? err.message : "Request failed — is the server running?",
        },
      });
    } finally {
      setStatus("done");
    }
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Personalization Debug View</h2>
          <p className="mt-1 text-sm text-slate-500">
            Fill out the questionnaire, then inspect exactly what was sent to Groq and what came back.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={mockMode}
              onChange={(e) => setMockMode(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
            />
            Mock Mode
          </label>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={isLoading || !ready}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {isLoading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
              />
            )}
            {isLoading ? "Simulating…" : "Simulate Personalization"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Column 1: Input (Questionnaire) */}
        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Input — Questionnaire
            </h3>
          </div>
          <div className="max-h-[32rem] overflow-y-auto px-4 py-2">
            <QuestionnaireWizard
              questions={questions}
              questionsError={questionsError}
              answers={answers}
              onAnswer={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
              showDeepDive={showDeepDive}
              onShowDeepDive={() => setShowDeepDive(true)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Column 2: AI Request (The Prompt) */}
        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              AI Request — Prompt
            </h3>
          </div>
          <div className="max-h-[32rem] overflow-y-auto px-4 py-3">
            {mockMode && status === "done" && (
              <p className="text-xs italic text-slate-400">
                Mock Mode is ON — no request was sent to Groq.
              </p>
            )}
            {!mockMode && !aiRequest && (
              <p className="text-xs text-slate-400">
                {status === "idle"
                  ? "Nothing sent yet."
                  : "No prompt available (request may have failed before reaching the AI step)."}
              </p>
            )}
            {aiRequest && (
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    System
                  </p>
                  <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                    {aiRequest.system}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    User
                  </p>
                  <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                    {aiRequest.user}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: AI Response (The Result) */}
        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              AI Response — Result
            </h3>
            {aiResponse && (
              <p
                className={`mt-0.5 text-[11px] font-medium ${
                  aiResponse.status >= 200 && aiResponse.status < 300
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                HTTP {aiResponse.status || "—"}
              </p>
            )}
          </div>
          <div className="max-h-[32rem] overflow-y-auto px-4 py-3">
            {!aiResponse && <p className="text-xs text-slate-400">Nothing received yet.</p>}
            {aiResponse && (
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                {JSON.stringify(aiResponse.body, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
