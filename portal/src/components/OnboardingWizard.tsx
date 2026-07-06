import { useState } from "react";
import PalettePreview, { type BasePalette } from "./PalettePreview";
import PersonalizationSimulator from "./PersonalizationSimulator";

const ONBOARDING_ENDPOINT = "http://localhost:3000/developer/onboarding";

// Placeholder until real developer auth exists for the portal.
const DEVELOPER_ID = "11111111-1111-1111-1111-111111111111";

const MIN_PERSONALITY_TAGS = 1;
const MAX_PERSONALITY_TAGS = 8;

const CATEGORIES = [
  { value: "fintech", label: "Fintech" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "health_fitness", label: "Health & Fitness" },
  { value: "social", label: "Social" },
  { value: "productivity", label: "Productivity" },
  { value: "gaming", label: "Gaming" },
  { value: "education", label: "Education" },
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" },
] as const;

const KPIS = [
  { value: "engagement", label: "Engagement" },
  { value: "retention", label: "Retention" },
  { value: "conversion", label: "Conversion" },
  { value: "session_length", label: "Session Length" },
  { value: "onboarding_completion", label: "Onboarding Completion" },
] as const;

const PERSONALITY_TAGS = [
  "Innovative",
  "Trustworthy",
  "Playful",
  "Minimalist",
  "Bold",
  "Elegant",
  "Friendly",
  "Professional",
  "Energetic",
  "Calm",
] as const;

type Category = (typeof CATEGORIES)[number]["value"];
type Kpi = (typeof KPIS)[number]["value"];

type SubmitStatus = "idle" | "loading" | "success" | "error";

interface FormState {
  appName: string;
  appDescription: string;
  category: Category | "";
  customCategory: string;
  personalityTags: string[];
  targetAudience: string;
  kpi: Kpi | "";
}

const INITIAL_FORM_STATE: FormState = {
  appName: "",
  appDescription: "",
  category: "",
  customCategory: "",
  personalityTags: [],
  targetAudience: "",
  kpi: "",
};

function isFormValid(form: FormState): boolean {
  return (
    form.category !== "" &&
    (form.category !== "other" || form.customCategory.trim().length > 0) &&
    form.kpi !== "" &&
    form.personalityTags.length >= MIN_PERSONALITY_TAGS &&
    form.personalityTags.length <= MAX_PERSONALITY_TAGS
  );
}

export default function OnboardingWizard() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [paletteData, setPaletteData] = useState<BasePalette | null>(null);

  const personalityTagsAtLimit =
    form.personalityTags.length >= MAX_PERSONALITY_TAGS;

  function togglePersonalityTag(tag: string) {
    setForm((prev) => {
      const isSelected = prev.personalityTags.includes(tag);
      if (isSelected) {
        return {
          ...prev,
          personalityTags: prev.personalityTags.filter((t) => t !== tag),
        };
      }
      if (prev.personalityTags.length >= MAX_PERSONALITY_TAGS) {
        return prev;
      }
      return { ...prev, personalityTags: [...prev.personalityTags, tag] };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFormValid(form) || status === "loading") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(ONBOARDING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerId: DEVELOPER_ID,
          appMetadata: {
            category: form.category,
            ...(form.category === "other"
              ? { custom_category: form.customCategory.trim() }
              : {}),
            ...(form.appName.trim() ? { app_name: form.appName.trim() } : {}),
            ...(form.appDescription.trim()
              ? { app_description: form.appDescription.trim() }
              : {}),
            ...(form.targetAudience.trim()
              ? { target_audience: form.targetAudience.trim() }
              : {}),
            personality_tags: form.personalityTags,
            kpis: [form.kpi],
          },
        }),
      });

      if (response.status === 201) {
        const data = (await response.json()) as BasePalette;
        setPaletteData(data);
        setStatus("success");
        return;
      }

      const body = await response.json().catch(() => null);
      throw new Error(
        body?.message ?? `Request failed with status ${response.status}`,
      );
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl shadow-slate-200/60 ring-1 ring-slate-900/5 p-6 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            Onboard Your App
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500">
            Tell us about your app and we'll generate a base color palette for
            it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label
              htmlFor="app-name"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              App Name
            </label>
            <input
              id="app-name"
              type="text"
              value={form.appName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, appName: e.target.value }))
              }
              disabled={isLoading}
              placeholder="e.g. StudentFlow"
              maxLength={60}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="app-description"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              App Description
            </label>
            <textarea
              id="app-description"
              value={form.appDescription}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, appDescription: e.target.value }))
              }
              disabled={isLoading}
              placeholder="e.g. StudentFlow helps university students organize assignments, track deadlines, and study together in shared groups."
              maxLength={1000}
              rows={3}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              App Category
            </label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => {
                const category = e.target.value as Category;
                setForm((prev) => ({
                  ...prev,
                  category,
                  customCategory: category === "other" ? prev.customCategory : "",
                }));
              }}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                Select a category…
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {form.category === "other" && (
              <input
                type="text"
                value={form.customCategory}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customCategory: e.target.value }))
                }
                disabled={isLoading}
                placeholder="Please specify your app category"
                maxLength={50}
                className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Brand Personality
              </label>
              <span className="text-xs text-slate-400">
                {form.personalityTags.length}/{MAX_PERSONALITY_TAGS} selected
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PERSONALITY_TAGS.map((tag) => {
                const checked = form.personalityTags.includes(tag);
                const disabled =
                  isLoading || (!checked && personalityTagsAtLimit);
                return (
                  <label
                    key={tag}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      checked
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => togglePersonalityTag(tag)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30"
                    />
                    {tag}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Choose between {MIN_PERSONALITY_TAGS} and {MAX_PERSONALITY_TAGS}{" "}
              traits.
            </p>
          </div>

          <div>
            <label
              htmlFor="target-audience"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Target Audience
            </label>
            <input
              id="target-audience"
              type="text"
              value={form.targetAudience}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, targetAudience: e.target.value }))
              }
              disabled={isLoading}
              placeholder="e.g. University students juggling coursework and group projects"
              maxLength={200}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="kpi"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Primary KPI
            </label>
            <select
              id="kpi"
              value={form.kpi}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, kpi: e.target.value as Kpi }))
              }
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                Select a KPI…
              </option>
              {KPIS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          {status === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {status === "success" && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Your base palette was generated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid(form) || isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-600"
          >
            {isLoading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
              />
            )}
            {isLoading ? "Generating Palette…" : "Generate Base Palette"}
          </button>
        </form>
      </div>

      {paletteData && (
        <div className="w-full max-w-3xl animate-fade-in">
          <PalettePreview palette={paletteData} />
        </div>
      )}

      {paletteData && (
        <div className="w-full max-w-5xl animate-fade-in">
          <PersonalizationSimulator basePalette={paletteData} />
        </div>
      )}
    </div>
  );
}
