import { randomUUID } from "node:crypto";
import Groq from "groq-sdk";

import type { AppMetadata, BasePalette } from "../../types/basePalette.types";
import type {
  PersonalizedPalette,
  UiBehavior,
  BiInsights,
} from "../../types/personalizedPalette.types";
import type { ColorModes } from "../../types/colorScheme.types";
import type { UserAnswers } from "../../types/userAnswers.types";
import {
  buildBasePalettePrompt,
  buildPersonalizedPalettePrompt,
  type AiPrompt,
} from "./promptBuilder";
import {
  validateBasePalette,
  validatePersonalizedPalette,
} from "../../validation/schemaValidator";

export interface GenerateBasePaletteInput {
  developerId: string;
  version: number;
  appMetadata: AppMetadata;
}

export interface GeneratePersonalizedPaletteInput {
  basePalette: BasePalette;
  userId: string;
  userAnswers: UserAnswers;
  /** Debug/prompt-tuning tooling only — replaces the generated system prompt
   * before calling the AI provider. The user message (real base palette +
   * questionnaire context) is unchanged, so an experiment stays grounded in
   * real data and only varies the instructions. Ignored in mock mode, since
   * mock mode never reads the prompt at all. */
  systemPromptOverride?: string;
}

export interface AiProvider {
  generateBasePalette(input: GenerateBasePaletteInput): Promise<BasePalette>;
  generatePersonalizedPalette(
    input: GeneratePersonalizedPaletteInput,
  ): Promise<PersonalizedPalette>;
}

export class AiGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiGenerationError";
  }
}

// Additional attempts after the first failure — a network error, a malformed
// completion, or a schema-validation failure all count as a failed attempt.
const MAX_RETRY_ATTEMPTS = 2;

async function withRetry<T>(
  label: string,
  attempt: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let tryNumber = 1; tryNumber <= MAX_RETRY_ATTEMPTS + 1; tryNumber++) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
      // Without this, a failure is invisible until every retry is exhausted
      // and the caller just sees a generic 503 — no trace of *why* (auth,
      // rate limit, malformed completion, network) ends up in server logs.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`--- AI ERROR (${label}, attempt ${tryNumber}/${MAX_RETRY_ATTEMPTS + 1}) ---`);
      console.error(message);
    }
  }
  throw new AiGenerationError(
    `${label} failed after ${MAX_RETRY_ATTEMPTS + 1} attempts`,
    lastError,
  );
}

// Mock covers every non-production environment (dev, test, undefined) so the
// server never depends on the network unless it's deliberately run live.
function isMockMode(): boolean {
  return process.env.NODE_ENV !== "production";
}

// llama3-70b-8192 (Groq's old naming) was decommissioned — this is its
// direct successor. Confirmed against GET /openai/v1/models before picking it.
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (groqClient) return groqClient;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AiGenerationError("GROQ_API_KEY is not set");

  groqClient = new Groq({ apiKey });
  return groqClient;
}

/**
 * Calls the Groq chat-completions API and parses the completion as JSON.
 * Any network failure, API error, or malformed JSON throws — the caller's
 * withRetry() decides what to do next.
 */
async function callGroq(prompt: AiPrompt): Promise<unknown> {
  const client = getGroqClient();
  const model = process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL;

  const messages = [
    { role: "system" as const, content: prompt.system },
    { role: "user" as const, content: prompt.user },
  ];

  console.log("--- AI REQUEST ---");
  console.log(JSON.stringify(messages, null, 2));

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    // json_object mode plus the explicit "return only JSON" instruction
    // already baked into prompt.system (see promptBuilder.ts's
    // OUTPUT_FORMAT_RULE) — belt and suspenders against prose leaking in.
    response_format: { type: "json_object" },
    messages,
  });

  const content = completion.choices?.[0]?.message?.content;

  console.log("--- AI RESPONSE ---");
  console.log(content ?? "(no content in response)");

  if (!content)
    throw new Error("Groq API response contained no message content");

  return JSON.parse(content);
}

// --- Mock fixtures -----------------------------------------------------
// Fixed Material Design 3 baseline tokens (seed color #6750A4) — used verbatim
// as a stable, schema-valid fixture so development mode never depends on the
// network. Cast (not per-field asHexColor) because the shape is authored by
// hand here; validateBasePalette/validatePersonalizedPalette below is what
// actually re-checks it against the real schema before it's returned.
const MOCK_COLORS = {
  light: {
    primary: "#6750A4",
    onPrimary: "#FFFFFF",
    primaryContainer: "#EADDFF",
    onPrimaryContainer: "#21005D",
    inversePrimary: "#D0BCFF",
    secondary: "#625B71",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#E8DEF8",
    onSecondaryContainer: "#1D192B",
    tertiary: "#7D5260",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#FFD8E4",
    onTertiaryContainer: "#31111D",
    background: "#FFFBFE",
    onBackground: "#1C1B1F",
    surface: "#FFFBFE",
    onSurface: "#1C1B1F",
    surfaceVariant: "#E7E0EC",
    onSurfaceVariant: "#49454F",
    surfaceTint: "#6750A4",
    inverseSurface: "#313033",
    inverseOnSurface: "#F4EFF4",
    error: "#B3261E",
    onError: "#FFFFFF",
    errorContainer: "#F9DEDC",
    onErrorContainer: "#410E0B",
    outline: "#79747E",
    outlineVariant: "#CAC4D0",
    scrim: "#000000",
    surfaceBright: "#FFFBFE",
    surfaceDim: "#DED8E1",
    surfaceContainer: "#F3EDF7",
    surfaceContainerHigh: "#ECE6F0",
    surfaceContainerHighest: "#E6E0E9",
    surfaceContainerLow: "#F7F2FA",
    surfaceContainerLowest: "#FFFFFF",
  },
  dark: {
    primary: "#D0BCFF",
    onPrimary: "#381E72",
    primaryContainer: "#4F378B",
    onPrimaryContainer: "#EADDFF",
    inversePrimary: "#6750A4",
    secondary: "#CCC2DC",
    onSecondary: "#332D41",
    secondaryContainer: "#4A4458",
    onSecondaryContainer: "#E8DEF8",
    tertiary: "#EFB8C8",
    onTertiary: "#492532",
    tertiaryContainer: "#633B48",
    onTertiaryContainer: "#FFD8E4",
    background: "#1C1B1F",
    onBackground: "#E6E1E5",
    surface: "#1C1B1F",
    onSurface: "#E6E1E5",
    surfaceVariant: "#49454F",
    onSurfaceVariant: "#CAC4D0",
    surfaceTint: "#D0BCFF",
    inverseSurface: "#E6E1E5",
    inverseOnSurface: "#313033",
    error: "#F2B8B5",
    onError: "#601410",
    errorContainer: "#8C1D18",
    onErrorContainer: "#F9DEDC",
    outline: "#938F99",
    outlineVariant: "#49454F",
    scrim: "#000000",
    surfaceBright: "#3B383E",
    surfaceDim: "#141218",
    surfaceContainer: "#211F26",
    surfaceContainerHigh: "#2B2930",
    surfaceContainerHighest: "#36343B",
    surfaceContainerLow: "#1D1B20",
    surfaceContainerLowest: "#0F0D13",
  },
} as unknown as ColorModes;

// --- Rule-based mock engine (5 profiles) ---------------------------------
// Keyword-matched against the questionnaire so mock mode still visibly
// reacts to different answers instead of returning one fixed palette
// regardless of input — see getMockResponse() below. Every role pair here
// was generated and WCAG-AA-verified (>=4.5:1, both modes) programmatically
// before being pasted in as flat literals; see the reasoning in this
// function's neighboring comments for how each color slot was chosen.

// Roles shared by every profile — deliberately NOT part of the "visual
// diversity" requirement (that's primary/secondary/tertiary), so vibrant
// accents sit on the same neutral surfaces the rest of the app already uses.
// Identical to MOCK_COLORS above.
interface MockNeutrals {
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  outline: string;
  outlineVariant: string;
  scrim: string;
  surfaceBright: string;
  surfaceDim: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceContainerLow: string;
  surfaceContainerLowest: string;
}

const LIGHT_NEUTRALS: MockNeutrals = {
  background: "#FFFBFE",
  onBackground: "#1C1B1F",
  surface: "#FFFBFE",
  onSurface: "#1C1B1F",
  surfaceVariant: "#E7E0EC",
  onSurfaceVariant: "#49454F",
  inverseSurface: "#313033",
  inverseOnSurface: "#F4EFF4",
  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",
  outline: "#79747E",
  outlineVariant: "#CAC4D0",
  scrim: "#000000",
  surfaceBright: "#FFFBFE",
  surfaceDim: "#DED8E1",
  surfaceContainer: "#F3EDF7",
  surfaceContainerHigh: "#ECE6F0",
  surfaceContainerHighest: "#E6E0E9",
  surfaceContainerLow: "#F7F2FA",
  surfaceContainerLowest: "#FFFFFF",
};

const DARK_NEUTRALS: MockNeutrals = {
  background: "#1C1B1F",
  onBackground: "#E6E1E5",
  surface: "#1C1B1F",
  onSurface: "#E6E1E5",
  surfaceVariant: "#49454F",
  onSurfaceVariant: "#CAC4D0",
  inverseSurface: "#E6E1E5",
  inverseOnSurface: "#313033",
  error: "#F2B8B5",
  onError: "#601410",
  errorContainer: "#8C1D18",
  onErrorContainer: "#F9DEDC",
  outline: "#938F99",
  outlineVariant: "#49454F",
  scrim: "#000000",
  surfaceBright: "#3B383E",
  surfaceDim: "#141218",
  surfaceContainer: "#211F26",
  surfaceContainerHigh: "#2B2930",
  surfaceContainerHighest: "#36343B",
  surfaceContainerLow: "#1D1B20",
  surfaceContainerLowest: "#0F0D13",
};

interface MockRoleTriad {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  inversePrimary: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
}

function buildMockScheme(roles: MockRoleTriad, neutrals: MockNeutrals) {
  // surfaceTint mirrors primary, same as real Material3 theming and as
  // MOCK_COLORS above already does.
  return { ...roles, ...neutrals, surfaceTint: roles.primary };
}

interface MockProfile {
  colors: ColorModes;
  ui_behavior: UiBehavior;
  bi_insights: BiInsights;
}

const MOCK_CREATIVE: MockProfile = {
  colors: {
    light: buildMockScheme(
      {
        primary: "#A36817",
        onPrimary: "#FFFFFF",
        primaryContainer: "#F4E8D7",
        onPrimaryContainer: "#50340B",
        inversePrimary: "#F2D2A6",
        secondary: "#31817B",
        onSecondary: "#FFFFFF",
        secondaryContainer: "#DAF1EF",
        onSecondaryContainer: "#19433F",
        tertiary: "#B82E67",
        onTertiary: "#FFFFFF",
        tertiaryContainer: "#F4D7E3",
        onTertiaryContainer: "#491229",
      },
      LIGHT_NEUTRALS,
    ),
    dark: buildMockScheme(
      {
        primary: "#F2D2A6",
        onPrimary: "#47361F",
        primaryContainer: "#684D27",
        onPrimaryContainer: "#EAE2D7",
        inversePrimary: "#B37319",
        secondary: "#B5E3DF",
        onSecondary: "#1F4744",
        secondaryContainer: "#276862",
        onSecondaryContainer: "#D7EAE8",
        tertiary: "#EBADC7",
        onTertiary: "#471F30",
        tertiaryContainer: "#682742",
        onTertiaryContainer: "#EAD7DF",
      },
      DARK_NEUTRALS,
    ),
  } as unknown as ColorModes,
  ui_behavior: {
    border_radius_dp: 24,
    animation_speed: "normal",
    contrast_level: "normal",
    elevation_style: "shadowed",
  },
  bi_insights: {
    persona_label: "Creative Spark",
    confidence_score: 0.85,
    traits: ["imaginative", "warm", "expressive"],
    mutation_reason:
      "Mock profile (rule-based, keyword match) — warm amber energy paired with a calming teal and a bold pink accent for a creative, inspired feel.",
    segment: "creative",
  },
};

const MOCK_FOCUS: MockProfile = {
  colors: {
    light: buildMockScheme(
      {
        primary: "#483FA6",
        onPrimary: "#FFFFFF",
        primaryContainer: "#DCDAF1",
        onPrimaryContainer: "#1D1943",
        inversePrimary: "#B9B5E3",
        secondary: "#5D7E4C",
        onSecondary: "#FFFFFF",
        secondaryContainer: "#E3ECDF",
        onSecondaryContainer: "#2A3922",
        tertiary: "#B24934",
        onTertiary: "#FFFFFF",
        tertiaryContainer: "#F4DCD7",
        onTertiaryContainer: "#471D15",
      },
      LIGHT_NEUTRALS,
    ),
    dark: buildMockScheme(
      {
        primary: "#B9B5E3",
        onPrimary: "#221F47",
        primaryContainer: "#2D2768",
        onPrimaryContainer: "#D9D7EA",
        inversePrimary: "#403894",
        secondary: "#C8D9BF",
        onSecondary: "#2F4026",
        secondaryContainer: "#415936",
        onSecondaryContainer: "#DEE8D9",
        tertiary: "#E8B9B0",
        onTertiary: "#47251F",
        tertiaryContainer: "#683227",
        onTertiaryContainer: "#EADAD7",
      },
      DARK_NEUTRALS,
    ),
  } as unknown as ColorModes,
  ui_behavior: {
    border_radius_dp: 8,
    animation_speed: "reduced_motion",
    contrast_level: "high",
    elevation_style: "flat",
  },
  bi_insights: {
    persona_label: "Deep Focus",
    confidence_score: 0.85,
    traits: ["calm", "thorough", "composed"],
    mutation_reason:
      "Mock profile (rule-based, keyword match) — deep indigo for concentration, a muted sage for quiet, and a soft coral accent that adds warmth without becoming a distraction.",
    segment: "focus",
  },
};

const MOCK_ENERGETIC: MockProfile = {
  colors: {
    light: buildMockScheme(
      {
        primary: "#4F821C",
        onPrimary: "#FFFFFF",
        primaryContainer: "#E6F4D7",
        onPrimaryContainer: "#2E4C10",
        inversePrimary: "#CCEDAB",
        secondary: "#8A2EB8",
        onSecondary: "#FFFFFF",
        secondaryContainer: "#EAD7F4",
        onSecondaryContainer: "#371249",
        tertiary: "#1579C1",
        onTertiary: "#FFFFFF",
        tertiaryContainer: "#D7E8F4",
        onTertiaryContainer: "#093453",
      },
      LIGHT_NEUTRALS,
    ),
    dark: buildMockScheme(
      {
        primary: "#CCEDAB",
        onPrimary: "#33471F",
        primaryContainer: "#476827",
        onPrimaryContainer: "#E0EAD7",
        inversePrimary: "#66A824",
        secondary: "#D6ADEB",
        onSecondary: "#3A1F47",
        secondaryContainer: "#522768",
        onSecondaryContainer: "#E3D7EA",
        tertiary: "#A3D3F5",
        onTertiary: "#1F3647",
        tertiaryContainer: "#274D68",
        onTertiaryContainer: "#D7E2EA",
      },
      DARK_NEUTRALS,
    ),
  } as unknown as ColorModes,
  ui_behavior: {
    border_radius_dp: 28,
    animation_speed: "fast",
    contrast_level: "normal",
    elevation_style: "shadowed",
  },
  bi_insights: {
    persona_label: "Morning Momentum",
    confidence_score: 0.85,
    traits: ["fast-paced", "vibrant", "active"],
    mutation_reason:
      "Mock profile (rule-based, keyword match) — a lime-green/purple/electric-blue combination for someone constantly on the move, mornings and commutes included.",
    segment: "energetic",
  },
};

const MOCK_BALANCED: MockProfile = {
  colors: {
    light: buildMockScheme(
      {
        primary: "#2F7CA3",
        onPrimary: "#FFFFFF",
        primaryContainer: "#D7EAF4",
        onPrimaryContainer: "#153647",
        inversePrimary: "#B0D5E8",
        secondary: "#9B6B3B",
        onSecondary: "#FFFFFF",
        secondaryContainer: "#F1E6DA",
        onSecondaryContainer: "#432E19",
        tertiary: "#6B45A1",
        onTertiary: "#FFFFFF",
        tertiaryContainer: "#E4DBF0",
        onTertiaryContainer: "#2B1C40",
      },
      LIGHT_NEUTRALS,
    ),
    dark: buildMockScheme(
      {
        primary: "#B0D5E8",
        onPrimary: "#1F3A47",
        primaryContainer: "#275268",
        onPrimaryContainer: "#D7E3EA",
        inversePrimary: "#2E799E",
        secondary: "#E3CCB5",
        onSecondary: "#47331F",
        secondaryContainer: "#684727",
        onSecondaryContainer: "#EAE0D7",
        tertiary: "#C9B8E0",
        onTertiary: "#301F47",
        tertiaryContainer: "#432B64",
        onTertiaryContainer: "#DFD7EA",
      },
      DARK_NEUTRALS,
    ),
  } as unknown as ColorModes,
  ui_behavior: {
    border_radius_dp: 16,
    animation_speed: "normal",
    contrast_level: "normal",
    elevation_style: "shadowed",
  },
  bi_insights: {
    persona_label: "Steady Balance",
    confidence_score: 0.85,
    traits: ["orderly", "stable", "measured"],
    mutation_reason:
      "Mock profile (rule-based, keyword match) — sky blue, soft peach, and a warm violet accent in even measure, for someone who values order and stability.",
    segment: "balanced",
  },
};

const MOCK_NIGHT: MockProfile = {
  colors: {
    light: buildMockScheme(
      {
        primary: "#344DB2",
        onPrimary: "#FFFFFF",
        primaryContainer: "#D7DDF4",
        onPrimaryContainer: "#151F47",
        inversePrimary: "#B0BBE8",
        secondary: "#13855F",
        onSecondary: "#FFFFFF",
        secondaryContainer: "#D7F4EA",
        onSecondaryContainer: "#0B5039",
        tertiary: "#89732E",
        onTertiary: "#FFFFFF",
        tertiaryContainer: "#F2ECD9",
        onTertiaryContainer: "#453917",
      },
      LIGHT_NEUTRALS,
    ),
    dark: buildMockScheme(
      {
        primary: "#B0BBE8",
        onPrimary: "#1F2747",
        primaryContainer: "#273468",
        onPrimaryContainer: "#D7DBEA",
        inversePrimary: "#2E449E",
        secondary: "#A6F2D9",
        onSecondary: "#1F473A",
        secondaryContainer: "#276852",
        onSecondaryContainer: "#D7EAE3",
        tertiary: "#E6D9B3",
        onTertiary: "#473D1F",
        tertiaryContainer: "#685727",
        onTertiaryContainer: "#EAE5D7",
      },
      DARK_NEUTRALS,
    ),
  } as unknown as ColorModes,
  ui_behavior: {
    border_radius_dp: 20,
    animation_speed: "slow",
    contrast_level: "high",
    elevation_style: "flat",
  },
  bi_insights: {
    persona_label: "Night Owl",
    confidence_score: 0.85,
    traits: ["nocturnal", "eye-conscious", "calm"],
    mutation_reason:
      "Mock profile (rule-based, keyword match) — midnight blue, neon mint, and a soft gold accent: a dark-mode-friendly palette for low-light, late-night use.",
    segment: "night",
  },
};

// Checked in this order; MOCK_CREATIVE is both explicitly matchable and the
// fallback, so it's listed last — the explicit check only matters if a
// creative keyword co-occurs with another profile's in the same answer set.
const PROFILE_KEYWORDS: Array<{ profile: MockProfile; keywords: string[] }> = [
  { profile: MOCK_FOCUS, keywords: ["ריכוז", "שקט", "יסודי"] },
  { profile: MOCK_ENERGETIC, keywords: ["בוקר", "נסיעות", "מהיר"] },
  { profile: MOCK_BALANCED, keywords: ["סדר", "יציבות", "מאוזן"] },
  { profile: MOCK_NIGHT, keywords: ["לילה", "dark mode", "עיניים"] },
  { profile: MOCK_CREATIVE, keywords: ["יצירתיות", "חום", "השראה"] },
];

/**
 * Rule-based mock engine: picks one of 5 hand-authored, WCAG-AA-verified
 * profiles by keyword-matching the questionnaire's answer text, so mock mode
 * (see isMockMode()) still visibly reacts to different answers instead of
 * returning one fixed palette regardless of input. Falls back to
 * MOCK_CREATIVE if nothing matches. Only ever called when isMockMode() is
 * true — never reachable in production/live mode.
 */
function getMockResponse(userAnswers: UserAnswers): MockProfile {
  const combinedAnswers = userAnswers.responses
    .map((r) => r.answer_value)
    .join(" ")
    .toLowerCase();

  for (const { profile, keywords } of PROFILE_KEYWORDS) {
    if (keywords.some((keyword) => combinedAnswers.includes(keyword.toLowerCase()))) {
      return profile;
    }
  }

  return MOCK_CREATIVE;
}

// --- Provider ------------------------------------------------------------

export class GroqAiProvider implements AiProvider {
  async generateBasePalette(
    input: GenerateBasePaletteInput,
  ): Promise<BasePalette> {
    if (isMockMode()) {
      const candidate: BasePalette = {
        schema_version: "1.0",
        palette_id: randomUUID(),
        developer_id: input.developerId,
        version: input.version,
        app_metadata: input.appMetadata,
        colors: MOCK_COLORS,
        generated_at: new Date().toISOString(),
      };
      validateBasePalette(candidate);
      return candidate;
    }

    return withRetry("generateBasePalette", async () => {
      const prompt = buildBasePalettePrompt(input.appMetadata);
      const colors = (await callGroq(prompt)) as ColorModes;

      const candidate: BasePalette = {
        schema_version: "1.0",
        palette_id: randomUUID(),
        developer_id: input.developerId,
        version: input.version,
        app_metadata: input.appMetadata,
        colors,
        generated_at: new Date().toISOString(),
      };

      validateBasePalette(candidate);
      return candidate;
    });
  }

  async generatePersonalizedPalette(
    input: GeneratePersonalizedPaletteInput,
  ): Promise<PersonalizedPalette> {
    if (isMockMode()) {
      const mock = getMockResponse(input.userAnswers);
      const candidate: PersonalizedPalette = {
        schema_version: "1.0",
        palette_id: randomUUID(),
        base_palette_id: input.basePalette.palette_id,
        base_palette_version: input.basePalette.version,
        user_id: input.userId,
        colors: mock.colors,
        ui_behavior: mock.ui_behavior,
        bi_insights: mock.bi_insights,
        generated_at: new Date().toISOString(),
      };
      validatePersonalizedPalette(candidate);
      return candidate;
    }

    return withRetry("generatePersonalizedPalette", async () => {
      const builtPrompt = buildPersonalizedPalettePrompt(
        input.basePalette,
        input.userAnswers,
      );
      const prompt: AiPrompt = input.systemPromptOverride
        ? { ...builtPrompt, system: input.systemPromptOverride }
        : builtPrompt;
      const parsed = (await callGroq(prompt)) as {
        colors: ColorModes;
        ui_behavior: UiBehavior;
        bi_insights: BiInsights;
      };

      const candidate: PersonalizedPalette = {
        schema_version: "1.0",
        palette_id: randomUUID(),
        base_palette_id: input.basePalette.palette_id,
        base_palette_version: input.basePalette.version,
        user_id: input.userId,
        colors: parsed.colors,
        ui_behavior: parsed.ui_behavior,
        bi_insights: parsed.bi_insights,
        generated_at: new Date().toISOString(),
      };

      validatePersonalizedPalette(candidate);
      return candidate;
    });
  }
}
