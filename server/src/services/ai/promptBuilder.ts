import type { AppMetadata, BasePalette } from "../../types/basePalette.types";
import type { UserAnswers } from "../../types/userAnswers.types";
import type { Material3ColorScheme } from "../../types/colorScheme.types";
import { buildQuestionnaireContext } from "../questions/questionsService";
import type { SubmissionStats } from "../submissions/submissionsService";

/**
 * Splitting system/user lets callers map directly onto the Claude Messages
 * API (`system` param + `messages: [{ role: "user", ... }]`) or a Grok/OpenAI
 * chat-completions call (`system` role + `user` role) without reshaping.
 */
export interface AiPrompt {
  system: string;
  user: string;
}

const WCAG_AA_CONTRAST_RATIO = 4.5;

// Field order mirrors Material3ColorScheme exactly — the AI must return
// these keys, and only these keys, per mode (schema has additionalProperties: false).
const MATERIAL3_COLOR_FIELDS: (keyof Material3ColorScheme)[] = [
  "primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "inversePrimary",
  "secondary", "onSecondary", "secondaryContainer", "onSecondaryContainer",
  "tertiary", "onTertiary", "tertiaryContainer", "onTertiaryContainer",
  "background", "onBackground",
  "surface", "onSurface", "surfaceVariant", "onSurfaceVariant", "surfaceTint",
  "inverseSurface", "inverseOnSurface",
  "error", "onError", "errorContainer", "onErrorContainer",
  "outline", "outlineVariant",
  "scrim",
  "surfaceBright", "surfaceDim", "surfaceContainer", "surfaceContainerHigh",
  "surfaceContainerHighest", "surfaceContainerLow", "surfaceContainerLowest",
];

// Only the roles an AI needs to see to derive a harmonious personalized
// scheme — sending all 35 fields x 2 modes per palette would burn tokens
// for information the model doesn't need to make a design decision.
const KEY_COLOR_ROLES = ["primary", "secondary", "tertiary", "error", "background", "surface"] as const;
type KeyColorRole = (typeof KEY_COLOR_ROLES)[number];
type KeyColorSnapshot = Record<KeyColorRole, string>;

function extractKeyColors(scheme: Material3ColorScheme): KeyColorSnapshot {
  const snapshot = {} as KeyColorSnapshot;
  for (const role of KEY_COLOR_ROLES) snapshot[role] = scheme[role];
  return snapshot;
}

/**
 * Trims a BasePalette down to the fields an AI call actually needs to derive
 * a PersonalizedPalette: app category/personality (for tone) and a handful
 * of seed colors per mode (for harmony) — not the full 70-field ColorModes
 * object or bookkeeping fields like palette_id/generated_at.
 */
export function buildPromptContext(basePalette: BasePalette): {
  app_metadata: AppMetadata;
  key_colors: { light: KeyColorSnapshot; dark: KeyColorSnapshot };
} {
  return {
    app_metadata: basePalette.app_metadata,
    key_colors: {
      light: extractKeyColors(basePalette.colors.light),
      dark: extractKeyColors(basePalette.colors.dark),
    },
  };
}

const OUTPUT_FORMAT_RULE = `Output rules:
- Return raw JSON only. No markdown code fences, no explanations, no leading/trailing text.
- The JSON must be a single object matching the schema described below, with no extra top-level fields.`;

const CONTRAST_RULE = `Accessibility:
- Every text-on-background pairing (e.g. onPrimary on primary, onSurface on surface) must meet WCAG AA: a contrast ratio of at least ${WCAG_AA_CONTRAST_RATIO}:1.
- Verify this for both the "light" and "dark" color modes independently.`;

const TONE_RULE = `Color tone:
- Favor modern, professional app-like tones — the kind of balanced, tasteful hues seen in polished consumer apps — over neon, fluorescent, or oversaturated colors.
- A vivid or energetic persona should still read as rich and confident, not glowing or eye-straining. Lean toward slightly muted/deepened saturation rather than pure, maximum-saturation hues.`;

// Pivoted from an explicit, example-driven rulebook (see git history) to an
// agentic consultant framing per product direction: trust the model's
// professional judgment on hue/mood/ui_behavior rather than enumerating
// if-then mappings. The one holdover from the rulebook era is the bolded
// sentence inside Technical Integrity — accessibility-relevant signals
// stopped producing real color changes without an explicit, non-negotiable
// instruction, the same way contrast already is one below. Cut that if this
// keeps handling it correctly on its own.
const CONSULTANT_ROLE = `Role: You are a world-class Color Psychologist and UI/UX Strategist. Your task is to act as a professional consultant who builds the visual identity of an app based on a user's psychological profile.

How to work:
- Analyze: Look at the user's questionnaire as a whole narrative. Don't look for keywords; look for the "vibe" and the psychological intent behind their answers. Understand the persona as a human, not just a data point.
- Professional Decision: Based on your expertise as a color psychologist, decide the best color palette for this specific user. You are the expert — choose the hue, saturation, and balance that will make the user feel comfortable, engaged, or productive within the app.
- Justification: In the "mutation_reason" field of the JSON output, provide a Design Rationale. Explain clearly why these specific colors are the perfect match for this user's personality, and why they differ from the base palette.
- Flexibility: You are free to move away from the base palette entirely if that serves the user's psychological needs better. The base palette is just a starting point — your design expertise is the ultimate authority.
- Technical Integrity: You must ensure the result is a valid Material3 ColorScheme that meets WCAG AA contrast standards (${WCAG_AA_CONTRAST_RATIO}:1). **If anything in the questionnaire signals a visual or accessibility sensitivity (e.g. sensitivity to strong colors, low-light environments), treat that with the same non-negotiable weight as the contrast ratio — it is a technical requirement, not a stylistic option.**`;

function buildColorSchemeFieldList(): string {
  return MATERIAL3_COLOR_FIELDS.map((f) => `"${f}"`).join(", ");
}

export function buildBasePalettePrompt(appMetadata: AppMetadata): AiPrompt {
  const system = `You are a Material3 color system designer for the ColorTouch SDK.
Given a developer's app metadata, generate a BasePalette: a light and dark Material3 ColorScheme that reflects the app's category and personality.

If "app_name", "app_description", and/or "target_audience" are present in the app metadata below, treat them as the strongest signal of intended tone — read the description closely and let it drive hue, saturation, and mood choices, not just the "category" enum. category/personality_tags/kpis are structured hints; the free-text fields are what the app actually is.

${CONTRAST_RULE}

${TONE_RULE}

Schema:
- Return an object with exactly two top-level keys: "light" and "dark".
- Each must contain exactly these fields, each a "#RRGGBB" hex string: ${buildColorSchemeFieldList()}.
- Do not add, omit, or rename fields.

${OUTPUT_FORMAT_RULE}`;

  const user = `Generate a BasePalette for this app:
${JSON.stringify({ app_metadata: appMetadata }, null, 2)}`;

  return { system, user };
}

function describeUiBehaviorGuidance(): string {
  return `Apply the same professional judgment to ui_behavior as you do to color choice — infer border_radius_dp, animation_speed, contrast_level, and elevation_style from the whole persona, not from isolated keywords. Each should feel like a deliberate design decision consistent with the mood of the palette you chose, not a default. bi_insights.confidence_score should reflect your genuine certainty (0-1) — more questionnaire answers (especially the optional deep-dive ones) generally supports higher confidence than the 5 core answers alone.`;
}

export function buildPersonalizedPalettePrompt(
  basePalette: BasePalette,
  userAnswers: UserAnswers
): AiPrompt {
  const context = buildPromptContext(basePalette);
  const questionnaireResponses = buildQuestionnaireContext(userAnswers);

  const system = `${CONSULTANT_ROLE}

Given an existing BasePalette (trimmed to its key seed colors) and the end user's full questionnaire responses (each entry is the original question text paired with their chosen answer), derive a PersonalizedPalette: a full light/dark Material3 ColorScheme plus ui_behavior and bi_insights.

${CONTRAST_RULE}

${TONE_RULE}

${describeUiBehaviorGuidance()}

Output schema (strict):
- "colors.light" and "colors.dark" must each contain exactly these fields, each a "#RRGGBB" hex string: ${buildColorSchemeFieldList()}.
- "ui_behavior" must contain exactly: "border_radius_dp" (integer 0-32), "animation_speed" ("slow" | "normal" | "fast" | "reduced_motion"), "contrast_level" ("low" | "normal" | "high"), "elevation_style" ("flat" | "shadowed").
- "bi_insights" must contain exactly: "persona_label" (string — a short, human-readable persona name synthesized from your analysis), "confidence_score" (number 0-1), "traits" (string array, max 10), "mutation_reason" (string — your Design Rationale: 1-3 sentences explaining why these colors are the right match for this person, and why they differ from the base palette), optionally "segment" (string).
- Do not add, omit, or rename fields. Do not include palette_id, base_palette_id, base_palette_version, user_id, schema_version, or generated_at — the caller fills those in.

${OUTPUT_FORMAT_RULE}`;

  const user = `Derive a PersonalizedPalette from this context:
${JSON.stringify({ base_context: context, questionnaire_responses: questionnaireResponses }, null, 2)}`;

  return { system, user };
}

/**
 * Builds the prompt for a developer-facing "who is this app for, and what
 * does it provide" analysis, grounded in the app's own metadata plus
 * aggregated (never per-user) stats about the end users who've completed the
 * in-app questionnaire so far.
 */
export function buildAudienceInsightPrompt(
  appMetadata: AppMetadata,
  stats: SubmissionStats,
): AiPrompt {
  const system = `You are a product analyst for the ColorTouch SDK's developer dashboard.

Given an app's metadata and aggregated stats about the end users who completed its in-app personalization questionnaire, write a concise business analysis for the app's developer.

How to work:
- Ground every claim in the actual data provided (age/persona/segment distribution, top traits) — don't invent demographics that aren't supported by it.
- If total_submissions is 0 or very low, say so plainly rather than fabricating a confident-sounding analysis.

Output schema (strict):
- Return an object with exactly two string fields: "target_audience" and "value_proposition".
- "target_audience": 2-4 sentences describing who this app's end users appear to be, grounded in the provided distribution data.
- "value_proposition": 2-4 sentences describing what the app provides its users and why personalized color/UI matters for that audience.
- Do not add, omit, or rename fields.

${OUTPUT_FORMAT_RULE}`;

  const user = `Analyze this app and its user base:
${JSON.stringify({ app_metadata: appMetadata, submission_stats: stats }, null, 2)}`;

  return { system, user };
}
