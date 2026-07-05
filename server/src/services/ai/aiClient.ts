import { randomUUID } from "node:crypto";

import type { AppMetadata, BasePalette } from "../../types/basePalette.types";
import type { PersonalizedPalette, UiBehavior, BiInsights } from "../../types/personalizedPalette.types";
import type { ColorModes } from "../../types/colorScheme.types";
import type { UserAnswers } from "../../types/userAnswers.types";
import { buildBasePalettePrompt, buildPersonalizedPalettePrompt, type AiPrompt } from "./promptBuilder";
import { validateBasePalette, validatePersonalizedPalette } from "../../validation/schemaValidator";

export interface GenerateBasePaletteInput {
  developerId: string;
  version: number;
  appMetadata: AppMetadata;
}

export interface GeneratePersonalizedPaletteInput {
  basePalette: BasePalette;
  userId: string;
  userAnswers: UserAnswers;
}

export interface AiProvider {
  generateBasePalette(input: GenerateBasePaletteInput): Promise<BasePalette>;
  generatePersonalizedPalette(input: GeneratePersonalizedPaletteInput): Promise<PersonalizedPalette>;
}

export class AiGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AiGenerationError";
  }
}

// Additional attempts after the first failure — a network error, a malformed
// completion, or a schema-validation failure all count as a failed attempt.
const MAX_RETRY_ATTEMPTS = 2;

async function withRetry<T>(label: string, attempt: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let tryNumber = 1; tryNumber <= MAX_RETRY_ATTEMPTS + 1; tryNumber++) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
    }
  }
  throw new AiGenerationError(
    `${label} failed after ${MAX_RETRY_ATTEMPTS + 1} attempts`,
    lastError
  );
}

function isMockMode(): boolean {
  return process.env.NODE_ENV === "development";
}

interface GrokChatCompletion {
  choices: { message: { content: string } }[];
}

/**
 * Calls the xAI (Grok) chat-completions endpoint and parses the completion
 * as JSON. Any network failure, non-2xx response, or malformed JSON throws —
 * the caller's withRetry() decides what to do next.
 */
async function callGrok(prompt: AiPrompt): Promise<unknown> {
  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL;
  const baseUrl = process.env.XAI_API_BASE_URL ?? "https://api.x.ai/v1";

  if (!apiKey) throw new AiGenerationError("XAI_API_KEY is not set");
  if (!model) throw new AiGenerationError("XAI_MODEL is not set");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI API request failed: ${response.status} ${response.statusText}`);
  }

  const completion = (await response.json()) as GrokChatCompletion;
  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("xAI API response contained no message content");

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
    primary: "#6750A4", onPrimary: "#FFFFFF", primaryContainer: "#EADDFF", onPrimaryContainer: "#21005D",
    inversePrimary: "#D0BCFF",
    secondary: "#625B71", onSecondary: "#FFFFFF", secondaryContainer: "#E8DEF8", onSecondaryContainer: "#1D192B",
    tertiary: "#7D5260", onTertiary: "#FFFFFF", tertiaryContainer: "#FFD8E4", onTertiaryContainer: "#31111D",
    background: "#FFFBFE", onBackground: "#1C1B1F",
    surface: "#FFFBFE", onSurface: "#1C1B1F", surfaceVariant: "#E7E0EC", onSurfaceVariant: "#49454F",
    surfaceTint: "#6750A4",
    inverseSurface: "#313033", inverseOnSurface: "#F4EFF4",
    error: "#B3261E", onError: "#FFFFFF", errorContainer: "#F9DEDC", onErrorContainer: "#410E0B",
    outline: "#79747E", outlineVariant: "#CAC4D0",
    scrim: "#000000",
    surfaceBright: "#FFFBFE", surfaceDim: "#DED8E1",
    surfaceContainer: "#F3EDF7", surfaceContainerHigh: "#ECE6F0", surfaceContainerHighest: "#E6E0E9",
    surfaceContainerLow: "#F7F2FA", surfaceContainerLowest: "#FFFFFF",
  },
  dark: {
    primary: "#D0BCFF", onPrimary: "#381E72", primaryContainer: "#4F378B", onPrimaryContainer: "#EADDFF",
    inversePrimary: "#6750A4",
    secondary: "#CCC2DC", onSecondary: "#332D41", secondaryContainer: "#4A4458", onSecondaryContainer: "#E8DEF8",
    tertiary: "#EFB8C8", onTertiary: "#492532", tertiaryContainer: "#633B48", onTertiaryContainer: "#FFD8E4",
    background: "#1C1B1F", onBackground: "#E6E1E5",
    surface: "#1C1B1F", onSurface: "#E6E1E5", surfaceVariant: "#49454F", onSurfaceVariant: "#CAC4D0",
    surfaceTint: "#D0BCFF",
    inverseSurface: "#E6E1E5", inverseOnSurface: "#313033",
    error: "#F2B8B5", onError: "#601410", errorContainer: "#8C1D18", onErrorContainer: "#F9DEDC",
    outline: "#938F99", outlineVariant: "#49454F",
    scrim: "#000000",
    surfaceBright: "#3B383E", surfaceDim: "#141218",
    surfaceContainer: "#211F26", surfaceContainerHigh: "#2B2930", surfaceContainerHighest: "#36343B",
    surfaceContainerLow: "#1D1B20", surfaceContainerLowest: "#0F0D13",
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
  segment: "general",
};

// --- Provider ------------------------------------------------------------

export class GrokAiProvider implements AiProvider {
  async generateBasePalette(input: GenerateBasePaletteInput): Promise<BasePalette> {
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
      const colors = (await callGrok(prompt)) as ColorModes;

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
    input: GeneratePersonalizedPaletteInput
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
      const prompt = buildPersonalizedPalettePrompt(input.basePalette, input.userAnswers);
      const parsed = (await callGrok(prompt)) as {
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
