import type { AppMetadata, BasePalette } from "../../types/basePalette.types";
import type { UserAnswers } from "../../types/userAnswers.types";
import type { Material3ColorScheme } from "../../types/colorScheme.types";

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

// Placed first, ahead of everything else, and phrased as hard requirements
// rather than suggestions — earlier prompt revisions let the model treat
// "stay harmonious with the base identity" as license to return the base
// colors unchanged. This block exists specifically to override that.
const ACCESSIBILITY_OVERRIDE_RULES = `CRITICAL INSTRUCTION: You possess EXPLICIT PERMISSION and are REQUIRED to alter the actual HEX color codes from the Base Palette when the user profile demands it. Do NOT simply copy the base colors.

- For Color Blindness (e.g., Protanopia): You MUST shift problematic colors. Change red/green semantic color roles (such as "error", or any role acting as a success/danger signal) to safe, high-contrast alternatives like blue, orange, or yellow.
- For Low Vision or Direct Sunlight: You MUST mathematically increase the contrast ratio. Lighten the light-mode colors and darken the dark-mode background colors significantly. Do not just rely on the ui_behavior flags to carry accessibility — the HEX values themselves must change.
- Accessibility absolutely overrides Brand Identity. If the base primary color is inaccessible for this specific user, CHANGE IT to a compliant HEX code. A personalized palette that is byte-for-byte identical to the base palette's colors is a failure, unless the user profile is a plain "standard" user with no accessibility needs.
- MANDATORY CONSTRAINT: Your generated HEX codes MUST differ from the input Base Palette HEX codes by at least a significant perceptual margin (delta). If you are adapting for Protanopia or Low Vision, you MUST pick colors that are outside the problematic spectrum of the original palette. You are explicitly allowed to discard the original color identity if it conflicts with accessibility.
- Include a brief field in bi_insights called "mutation_reason" explaining exactly why the color shifted from the base palette (e.g., "Shifted red to blue for Protanopia contrast"). If a color genuinely did not need to change (e.g. a plain standard user with no accessibility needs), say so explicitly instead of leaving this vague.`;

function buildColorSchemeFieldList(): string {
  return MATERIAL3_COLOR_FIELDS.map((f) => `"${f}"`).join(", ");
}

export function buildBasePalettePrompt(appMetadata: AppMetadata): AiPrompt {
  const system = `You are a Material3 color system designer for the ColorTouch SDK.
Given a developer's app metadata, generate a BasePalette: a light and dark Material3 ColorScheme that reflects the app's category and personality.

If "app_name", "app_description", and/or "target_audience" are present in the app metadata below, treat them as the strongest signal of intended tone — read the description closely and let it drive hue, saturation, and mood choices, not just the "category" enum. category/personality_tags/kpis are structured hints; the free-text fields are what the app actually is.

${CONTRAST_RULE}

Schema:
- Return an object with exactly two top-level keys: "light" and "dark".
- Each must contain exactly these fields, each a "#RRGGBB" hex string: ${buildColorSchemeFieldList()}.
- Do not add, omit, or rename fields.

${OUTPUT_FORMAT_RULE}`;

  const user = `Generate a BasePalette for this app:
${JSON.stringify({ app_metadata: appMetadata }, null, 2)}`;

  return { system, user };
}

function describeUiBehaviorGuidance(userAnswers: UserAnswers): string {
  return `UI behavior guidance:
- Map the user's traits below to ui_behavior. These are examples of the pattern to apply, not an exhaustive lookup table — use judgment for traits that don't literally match:
  - Anxious, formal, professional, or serious traits -> smaller border_radius_dp (sharp corners, e.g. 0-6), animation_speed "slow" or "reduced_motion", elevation_style "flat".
  - Young, playful, creative, or vibrant traits -> larger border_radius_dp (rounded corners, e.g. 16-28), animation_speed "fast", elevation_style "shadowed".
  - motion_sensitivity "high" must always force animation_speed to "reduced_motion", regardless of other traits.
  - contrast_level should be "high" whenever the user's traits suggest a need for stronger legibility (e.g. accessibility-related traits); otherwise "normal".
- bi_insights.confidence_score must reflect genuine certainty (0-1) based on how clearly the traits imply a persona — do not default to a fixed value.`;
}

export function buildPersonalizedPalettePrompt(
  basePalette: BasePalette,
  userAnswers: UserAnswers
): AiPrompt {
  const context = buildPromptContext(basePalette);

  const system = `${ACCESSIBILITY_OVERRIDE_RULES}

You are a Material3 color system designer for the ColorTouch SDK.
Given an existing BasePalette (trimmed to its key seed colors) and an end user's in-app preference questionnaire, derive a PersonalizedPalette: a full light/dark Material3 ColorScheme plus ui_behavior and bi_insights, tailored to that user. Stay harmonious with the base app identity only where doing so doesn't conflict with the accessibility requirements above — accessibility wins every conflict.

${CONTRAST_RULE}

${describeUiBehaviorGuidance(userAnswers)}

Schema:
- "colors.light" and "colors.dark" must each contain exactly these fields, each a "#RRGGBB" hex string: ${buildColorSchemeFieldList()}.
- "ui_behavior" must contain exactly: "border_radius_dp" (integer 0-32), "animation_speed" ("slow" | "normal" | "fast" | "reduced_motion"), "contrast_level" ("low" | "normal" | "high"), "elevation_style" ("flat" | "shadowed").
- "bi_insights" must contain exactly: "persona_label" (string), "confidence_score" (number 0-1), "traits" (string array, max 10), "mutation_reason" (string, 1-2 sentences), optionally "segment" (string).
- Do not add, omit, or rename fields. Do not include palette_id, base_palette_id, base_palette_version, user_id, schema_version, or generated_at — the caller fills those in.

${OUTPUT_FORMAT_RULE}`;

  const user = `Derive a PersonalizedPalette from this context:
${JSON.stringify({ base_context: context, user_answers: userAnswers }, null, 2)}`;

  return { system, user };
}
