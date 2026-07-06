import type { ColorModes } from "./PalettePreview";

const SWATCH_ROLES = ["primary", "secondary", "tertiary", "background", "surface", "error"] as const;

const ROLE_LABELS: Record<(typeof SWATCH_ROLES)[number], string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
  background: "Background",
  surface: "Surface",
  error: "Error",
};

function SwatchDot({ role, hex }: { role: string; hex: string }) {
  return (
    <div
      className="h-6 w-6 flex-shrink-0 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: hex }}
      title={`${role}: ${hex}`}
    />
  );
}

/**
 * Compact light/dark swatch rows for a personalized-palette debug response —
 * lets you see at a glance whether colors actually changed between runs,
 * instead of diffing raw hex codes inside a JSON blob. Hover a dot for its
 * role and hex value.
 */
export default function PaletteSwatchStrip({ colors }: { colors: ColorModes }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      {(["light", "dark"] as const).map((mode) => (
        <div key={mode} className="flex items-center gap-2">
          <span className="w-9 flex-shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {mode}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SWATCH_ROLES.map((role) => (
              <SwatchDot key={role} role={role} hex={colors[mode][role]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Labeled palette preview sized for narrow debug columns — a single-column
 * list of swatch + role + hex per mode, stacked light then dark. Unlike
 * PalettePreview's wide 2-column light/dark + 3-column swatch grid (built for
 * AppConfigPage's full-width layout), this doesn't overlap text when squeezed
 * into a ~1/3-width debug column.
 */
export function CompactPalettePreview({ colors, title }: { colors: ColorModes; title?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {title && <p className="mb-3 text-center text-sm font-semibold text-slate-900">{title}</p>}
      <div className="space-y-4">
        {(["light", "dark"] as const).map((mode) => (
          <div key={mode}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {mode === "light" ? "Light Mode" : "Dark Mode"}
            </p>
            <div className="space-y-1">
              {SWATCH_ROLES.map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 flex-shrink-0 rounded ring-1 ring-black/10"
                    style={{ backgroundColor: colors[mode][role] }}
                  />
                  <span className="w-20 flex-shrink-0 text-xs text-slate-600">{ROLE_LABELS[role]}</span>
                  <span className="font-mono text-[11px] uppercase text-slate-400">{colors[mode][role]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Best-effort extraction of a ColorModes shape from an unknown response
 * body — returns null for error bodies ({error, message}) or anything else
 * that doesn't look like a palette, so callers can render swatches only when
 * there's actually something to show. */
export function extractColorModes(body: unknown): ColorModes | null {
  if (typeof body !== "object" || body === null) return null;
  const colors = (body as { colors?: unknown }).colors;
  if (typeof colors !== "object" || colors === null) return null;
  const { light, dark } = colors as { light?: unknown; dark?: unknown };
  return light && dark ? (colors as ColorModes) : null;
}
