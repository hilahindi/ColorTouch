import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import colorSchemeSchema from "../schemas/colorScheme.schema.json";
import basePaletteSchema from "../schemas/basePalette.schema.json";
import personalizedPaletteSchema from "../schemas/personalizedPalette.schema.json";

import type { BasePalette } from "../types/basePalette.types";
import type { PersonalizedPalette } from "../types/personalizedPalette.types";

const BASE_PALETTE_SCHEMA_ID = "https://colortouch.dev/schemas/base-palette.json";
const PERSONALIZED_PALETTE_SCHEMA_ID =
  "https://colortouch.dev/schemas/personalized-palette.json";

export class SchemaValidationError extends Error {
  constructor(
    public readonly schemaId: string,
    public readonly errors: ErrorObject[]
  ) {
    super(`Schema validation failed for ${schemaId}: ${formatAjvErrors(errors)}`);
    this.name = "SchemaValidationError";
  }
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return "unknown validation error";
  return errors.map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ");
}

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv); // enables format: "uuid" and format: "date-time"

// Load order matters: the shared color-scheme schema must be registered
// before the schemas that $ref it, or ajv throws "can't resolve reference".
ajv.addSchema(colorSchemeSchema);
ajv.addSchema(basePaletteSchema);
ajv.addSchema(personalizedPaletteSchema);

const validateBasePaletteFn = ajv.getSchema(BASE_PALETTE_SCHEMA_ID) as
  | ValidateFunction<BasePalette>
  | undefined;
const validatePersonalizedPaletteFn = ajv.getSchema(PERSONALIZED_PALETTE_SCHEMA_ID) as
  | ValidateFunction<PersonalizedPalette>
  | undefined;

if (!validateBasePaletteFn || !validatePersonalizedPaletteFn) {
  // Fails fast at process startup rather than on the first request if a
  // schema file was renamed or its $id changed without updating this file.
  throw new Error("Failed to compile ColorTouch JSON Schemas — check $id references");
}

/**
 * Throws SchemaValidationError if `data` doesn't match BasePalette.
 * On success, TypeScript narrows `data` to BasePalette for the rest of the
 * calling function (`asserts` return type) — no separate cast needed.
 */
export function validateBasePalette(data: unknown): asserts data is BasePalette {
  // Non-null assertions are safe here: the module-level check above throws
  // at startup if either compiled validator is missing.
  if (!validateBasePaletteFn!(data)) {
    throw new SchemaValidationError("BasePalette", validateBasePaletteFn!.errors ?? []);
  }
}

/**
 * Throws SchemaValidationError if `data` doesn't match PersonalizedPalette.
 */
export function validatePersonalizedPalette(
  data: unknown
): asserts data is PersonalizedPalette {
  if (!validatePersonalizedPaletteFn!(data)) {
    throw new SchemaValidationError(
      "PersonalizedPalette",
      validatePersonalizedPaletteFn!.errors ?? []
    );
  }
}
