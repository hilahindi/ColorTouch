import { useState } from "react";
import { useQuestions } from "../hooks/useQuestions";
import QuestionnaireWizard, { isWizardReady, toQuestionResponses } from "../components/QuestionnaireWizard";
import PaletteSwatchStrip, { extractColorModes } from "../components/PaletteSwatchStrip";

const PERSONALIZATION_ENDPOINT = "http://localhost:3000/personalized-palette";

// Must match AppConfigPage's DEVELOPER_ID.
const DEVELOPER_ID = "11111111-1111-1111-1111-111111111111";

interface AiPromptDebug {
  system: string;
  user: string;
}

interface SimResponse {
  status: number;
  body: unknown;
}

export default function PromptTuningPage() {
  const { questions, error: questionsError } = useQuestions();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [aiResponse, setAiResponse] = useState<SimResponse | null>(null);
  const [usedEditedPrompt, setUsedEditedPrompt] = useState(false);

  const ready = isWizardReady(questions, answers);
  const isLoading = status === "loading";
  const responseColors = aiResponse ? extractColorModes(aiResponse.body) : null;

  async function handleTest() {
    setStatus("loading");
    setAiResponse(null);

    const responses = toQuestionResponses(answers);
    const userId = crypto.randomUUID();
    const hasOverride = systemPrompt.trim().length > 0;

    try {
      const response = await fetch(PERSONALIZATION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerId: DEVELOPER_ID,
          userId,
          debug: true,
          ...(hasOverride ? { promptOverride: { system: systemPrompt } } : {}),
          userAnswers: { user_id: userId, responses },
        }),
      });

      const body = await response
        .json()
        .catch(() => ({ error: "ParseError", message: "Response body was not valid JSON." }));

      const promptUsed = (body as { debug?: { prompt?: AiPromptDebug } })?.debug?.prompt ?? null;

      // First run: populate the editor with the server's real default prompt
      // so there's something concrete to tweak instead of starting blank.
      if (!hasOverride && promptUsed) {
        setSystemPrompt(promptUsed.system);
      }

      setUsedEditedPrompt(hasOverride);
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
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">System Prompt Editor</h2>
            <p className="mt-1 text-xs text-slate-500">
              Click "Test Prompt" once with an empty editor to load the server's real default
              here, then edit and re-test to compare.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTest}
            disabled={isLoading || !ready}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {isLoading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
              />
            )}
            {isLoading ? "Testing…" : "Test Prompt"}
          </button>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={isLoading}
          placeholder="Leave empty to use the server's default system prompt…"
          rows={12}
          className="w-full resize-y rounded-lg border border-slate-300 bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
        />
        {aiResponse && (
          <p className="mt-2 text-xs text-slate-400">
            Last run used the {usedEditedPrompt ? "edited" : "server default"} prompt above.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Test Answers
            </h3>
          </div>
          <div className="max-h-[28rem] overflow-y-auto px-4 py-2">
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

        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Result</h3>
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
          <div className="max-h-[28rem] overflow-y-auto px-4 py-3">
            {!aiResponse && <p className="text-xs text-slate-400">Nothing tested yet.</p>}
            {aiResponse && (
              <div className="space-y-3">
                {responseColors && <PaletteSwatchStrip colors={responseColors} />}
                <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                  {JSON.stringify(aiResponse.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
