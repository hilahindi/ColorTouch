import { useState } from "react";
import PalettePreview, { type ColorModes } from "./PalettePreview";

const PERSONALIZATION_ENDPOINT = "http://localhost:3000/personalized-palette";

// Must match OnboardingWizard's DEVELOPER_ID — the personalization endpoint
// looks up the base palette by developerId, so this only works against the
// developer that was just onboarded in this session.
const DEVELOPER_ID = "11111111-1111-1111-1111-111111111111";

// Server response shape for POST /personalized-palette. Kept local, same
// reasoning as PalettePreview's BasePalette type — no shared package yet.
interface PersonalizedPalette {
  palette_id: string;
  base_palette_id: string;
  base_palette_version: number;
  user_id: string;
  colors: ColorModes;
  ui_behavior: {
    border_radius_dp: number;
    animation_speed: string;
    contrast_level: string;
    elevation_style: string;
  };
  bi_insights: {
    persona_label: string;
    confidence_score: number;
    traits: string[];
  };
  generated_at: string;
}

interface BasePaletteInput {
  colors: ColorModes;
}

type UserProfileKey = "standard" | "low_vision" | "protanopia";
type LightingKey = "direct_sunlight" | "dark_room";

interface ProfileConfig {
  label: string;
  traits: string[];
  visualPreference: "minimal" | "vibrant" | "professional" | "playful";
  toneOfVoice: "formal" | "casual" | "playful" | "serious";
  motionSensitivity: "none" | "mild" | "high";
}

const USER_PROFILES: Record<UserProfileKey, ProfileConfig> = {
  standard: {
    label: "Standard User",
    traits: ["standard_vision"],
    visualPreference: "vibrant",
    toneOfVoice: "casual",
    motionSensitivity: "none",
  },
  low_vision: {
    label: "Low Vision",
    traits: ["low_vision", "needs_high_contrast"],
    visualPreference: "professional",
    toneOfVoice: "formal",
    motionSensitivity: "high",
  },
  protanopia: {
    label: "Color Blindness — Protanopia",
    traits: ["color_blindness_protanopia", "needs_high_contrast"],
    visualPreference: "minimal",
    toneOfVoice: "formal",
    motionSensitivity: "mild",
  },
};

const LIGHTING_ENVIRONMENTS: Record<LightingKey, { label: string; trait: string }> = {
  direct_sunlight: { label: "Direct Sunlight", trait: "outdoor_direct_sunlight" },
  dark_room: { label: "Dark Room", trait: "dark_room_low_light" },
};

type SimStatus = "idle" | "loading" | "success" | "error";

interface PersonalizationSimulatorProps {
  basePalette: BasePaletteInput;
}

function InsightBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-violet-50 px-3 py-1.5 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wide text-violet-400">
        {label}
      </div>
      <div className="text-xs font-semibold text-violet-700">{value}</div>
    </div>
  );
}

export default function PersonalizationSimulator({
  basePalette,
}: PersonalizationSimulatorProps) {
  const [profile, setProfile] = useState<UserProfileKey>("standard");
  const [lighting, setLighting] = useState<LightingKey>("direct_sunlight");
  const [status, setStatus] = useState<SimStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [personalizedPalette, setPersonalizedPalette] = useState<PersonalizedPalette | null>(
    null,
  );

  const isLoading = status === "loading";

  async function handleSimulate() {
    setStatus("loading");
    setErrorMessage("");

    const profileConfig = USER_PROFILES[profile];
    const lightingConfig = LIGHTING_ENVIRONMENTS[lighting];
    const userId = crypto.randomUUID();

    try {
      const response = await fetch(PERSONALIZATION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerId: DEVELOPER_ID,
          userId,
          userAnswers: {
            user_id: userId,
            visual_preference: profileConfig.visualPreference,
            tone_of_voice: profileConfig.toneOfVoice,
            motion_sensitivity: profileConfig.motionSensitivity,
            personality_traits: [...profileConfig.traits, lightingConfig.trait],
          },
        }),
      });

      if (response.status === 200) {
        const data = (await response.json()) as PersonalizedPalette;
        setPersonalizedPalette(data);
        setStatus("success");
        return;
      }

      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `Request failed with status ${response.status}`);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <div className="w-full rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-900/5 sm:p-8">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Personalization Simulator</h2>
        <p className="mt-1 text-sm text-slate-500">
          Simulate an end user's context and watch Groq personalize the palette live.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="user-profile"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            End User Profile
          </label>
          <select
            id="user-profile"
            value={profile}
            onChange={(e) => setProfile(e.target.value as UserProfileKey)}
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.entries(USER_PROFILES).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="lighting-environment"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Lighting Environment
          </label>
          <select
            id="lighting-environment"
            value={lighting}
            onChange={(e) => setLighting(e.target.value as LightingKey)}
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.entries(LIGHTING_ENVIRONMENTS).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status === "error" && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleSimulate}
        disabled={isLoading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-600"
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
          />
        )}
        {isLoading ? "Groq is personalizing…" : "Simulate Personalization"}
      </button>

      {personalizedPalette && (
        <div className="mt-8 animate-fade-in">
          <h3 className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            Base vs. Personalized
          </h3>

          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <InsightBadge label="Persona" value={personalizedPalette.bi_insights.persona_label} />
            <InsightBadge
              label="Confidence"
              value={`${Math.round(personalizedPalette.bi_insights.confidence_score * 100)}%`}
            />
            <InsightBadge
              label="Corner Radius"
              value={`${personalizedPalette.ui_behavior.border_radius_dp}dp`}
            />
            <InsightBadge
              label="Animation"
              value={personalizedPalette.ui_behavior.animation_speed}
            />
            <InsightBadge
              label="Contrast"
              value={personalizedPalette.ui_behavior.contrast_level}
            />
            <InsightBadge
              label="Elevation"
              value={personalizedPalette.ui_behavior.elevation_style}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <PalettePreview palette={basePalette} title="Base Palette" />
            <PalettePreview palette={personalizedPalette} title="Personalized for This User" />
          </div>
        </div>
      )}
    </div>
  );
}
