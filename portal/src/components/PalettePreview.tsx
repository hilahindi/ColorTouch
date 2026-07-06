// Minimal shape of the server's BasePalette response — only the fields this
// preview actually reads. Kept local since the portal has no shared package
// with the server yet.
export interface Material3ColorScheme {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  surface: string;
  error: string;
  [key: string]: string;
}

export interface ColorModes {
  light: Material3ColorScheme;
  dark: Material3ColorScheme;
}

export interface BasePalette {
  palette_id: string;
  developer_id: string;
  version: number;
  colors: ColorModes;
  generated_at: string;
}

interface PalettePreviewProps {
  // Only `colors` is actually read — a BasePalette *or* a PersonalizedPalette
  // (different envelope fields, same colors.light/dark shape) both satisfy this.
  palette: { colors: ColorModes };
  title?: string;
}

const DISPLAYED_ROLES = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "tertiary", label: "Tertiary" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "error", label: "Error" },
] as const;

function ColorSwatch({
  label,
  hex,
  labelClassName,
  hexClassName,
}: {
  label: string;
  hex: string;
  labelClassName: string;
  hexClassName: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="h-12 w-12 rounded-xl ring-1 ring-black/10 shadow-sm sm:h-14 sm:w-14"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      <span className={`text-xs font-medium ${labelClassName}`}>{label}</span>
      <span className={`font-mono text-[11px] uppercase ${hexClassName}`}>{hex}</span>
    </div>
  );
}

function ModeSection({
  title,
  scheme,
  variant,
}: {
  title: string;
  scheme: Material3ColorScheme;
  variant: "light" | "dark";
}) {
  const isDark = variant === "dark";

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 ${
        isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <h3
        className={`mb-4 text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}
      >
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {DISPLAYED_ROLES.map(({ key, label }) => (
          <ColorSwatch
            key={key}
            label={label}
            hex={scheme[key]}
            labelClassName={isDark ? "text-slate-200" : "text-slate-700"}
            hexClassName={isDark ? "text-slate-400" : "text-slate-400"}
          />
        ))}
      </div>
    </div>
  );
}

export default function PalettePreview({
  palette,
  title = "Generated Base Palette",
}: PalettePreviewProps) {
  return (
    <div className="w-full rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-900/5 sm:p-8">
      <h2 className="mb-5 text-center text-lg font-semibold text-slate-900">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ModeSection title="Light Mode" scheme={palette.colors.light} variant="light" />
        <ModeSection title="Dark Mode" scheme={palette.colors.dark} variant="dark" />
      </div>
    </div>
  );
}
