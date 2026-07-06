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

const MOCK_UI_BEHAVIOR: UiBehavior = {
  border_radius_dp: 16,
  animation_speed: "normal",
  contrast_level: "normal",
  elevation_style: "shadowed",
};

const MOCK_BI_INSIGHTS: BiInsights = {
  persona_label: "Balanced Explorer",
  confidence_score: 0.72,
  traits: ["calm", "curious"],
  mutation_reason: "Mock fixture — colors are not derived from the base palette.",
  segment: "general",
};

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
      const candidate: PersonalizedPalette = {
        schema_version: "1.0",
        palette_id: randomUUID(),
        base_palette_id: input.basePalette.palette_id,
        base_palette_version: input.basePalette.version,
        user_id: input.userId,
        colors: MOCK_COLORS,
        ui_behavior: MOCK_UI_BEHAVIOR,
        bi_insights: MOCK_BI_INSIGHTS,
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
