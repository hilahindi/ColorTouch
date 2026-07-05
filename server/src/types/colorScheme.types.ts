/**
 * Branded string type — a plain `string` cannot be assigned to `HexColor`
 * without going through `asHexColor()`, which is the runtime boundary where
 * ajv validation happens. This keeps "validated" and "unvalidated" strings
 * distinguishable at compile time.
 */
export type HexColor = string & { readonly __brand: "HexColor" };

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function asHexColor(value: string): HexColor {
  if (!HEX_COLOR_PATTERN.test(value)) {
    throw new Error(`Invalid hex color: "${value}"`);
  }
  return value as HexColor;
}

/**
 * Mirrors androidx.compose.material3.ColorScheme field-for-field so the SDK
 * can construct a ColorScheme directly from this object. Verify field names
 * against the Compose Material3 BOM version this project targets — the M3
 * surface-container roles were added after Material3 1.2.0.
 */
export interface Material3ColorScheme {
  primary: HexColor;
  onPrimary: HexColor;
  primaryContainer: HexColor;
  onPrimaryContainer: HexColor;
  inversePrimary: HexColor;

  secondary: HexColor;
  onSecondary: HexColor;
  secondaryContainer: HexColor;
  onSecondaryContainer: HexColor;

  tertiary: HexColor;
  onTertiary: HexColor;
  tertiaryContainer: HexColor;
  onTertiaryContainer: HexColor;

  background: HexColor;
  onBackground: HexColor;

  surface: HexColor;
  onSurface: HexColor;
  surfaceVariant: HexColor;
  onSurfaceVariant: HexColor;
  surfaceTint: HexColor;

  inverseSurface: HexColor;
  inverseOnSurface: HexColor;

  error: HexColor;
  onError: HexColor;
  errorContainer: HexColor;
  onErrorContainer: HexColor;

  outline: HexColor;
  outlineVariant: HexColor;

  scrim: HexColor;

  surfaceBright: HexColor;
  surfaceDim: HexColor;
  surfaceContainer: HexColor;
  surfaceContainerHigh: HexColor;
  surfaceContainerHighest: HexColor;
  surfaceContainerLow: HexColor;
  surfaceContainerLowest: HexColor;
}

export interface ColorModes {
  light: Material3ColorScheme;
  dark: Material3ColorScheme;
}
