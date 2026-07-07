// Fixed categorical order — assigned by position, never re-cycled per
// filter/selection, so a given slot always maps to the same slice across
// re-renders. Values from the validated default palette (light-mode, ≥12 CVD
// ΔE between any two adjacent slots in this order).
const CATEGORICAL_COLORS = [
  "#2a78d6", // blue
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
  "#e87ba4", // magenta
  "#eb6834", // orange
];

const SIZE = 140;
const CENTER = SIZE / 2;
const OUTER_R = 62;
const INNER_R = 36;
// Surface-colored gap between adjacent wedges (see dataviz skill: "surface
// gap" spacer) — a stroke in the card's own background color, not a border.
const GAP_STROKE = "#ffffff";

export interface DonutDatum {
  label: string;
  value: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function donutSlicePath(startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(CENTER, CENTER, OUTER_R, endAngle);
  const outerEnd = polarToCartesian(CENTER, CENTER, OUTER_R, startAngle);
  const innerStart = polarToCartesian(CENTER, CENTER, INNER_R, startAngle);
  const innerEnd = polarToCartesian(CENTER, CENTER, INNER_R, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

/**
 * Part-to-whole donut for a single categorical breakdown (≤6-8 slices) — a
 * legend with swatch + label + percentage always accompanies it, since some
 * categorical slots (aqua/yellow) fall under 3:1 contrast on a light surface
 * and can't carry meaning through hue alone (see dataviz skill's relief rule).
 */
export default function DonutChart({ title, data }: { title: string; data: DonutDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-400">No submissions yet.</p>
      </div>
    );
  }

  const nonZero = data.filter((d) => d.value > 0);
  // A single 100% slice sweeps a full 360° arc, whose SVG start/end points
  // are identical — the arc spec treats that as zero-length and paints
  // nothing. Capping just under 360° keeps it visually a full ring while
  // avoiding that degenerate case (only relevant when there's one slice —
  // multiple nonzero slices can never individually reach 360°).
  const maxAngle = nonZero.length === 1 ? 359.99 : 360;

  let cursor = 0;
  const slices = nonZero.map((d, i) => {
    const startAngle = cursor;
    const sweep = (d.value / total) * maxAngle;
    cursor += sweep;
    return {
      ...d,
      color: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length],
      path: donutSlicePath(startAngle, cursor),
      pct: (d.value / total) * 100,
    };
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="flex flex-col items-center gap-4">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          className="flex-shrink-0"
          role="img"
          aria-label={title}
        >
          {slices.map((s) => (
            <path key={s.label} d={s.path} fill={s.color} stroke={GAP_STROKE} strokeWidth={2} />
          ))}
        </svg>
        <ul className="flex w-full flex-col gap-2 text-xs">
          {slices.map((s) => (
            <li key={s.label} className="flex items-start gap-2 py-0.5">
              <span
                className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="flex-1 text-slate-700">{s.label}</span>
              <span className="flex-shrink-0 whitespace-nowrap font-mono text-slate-400">
                {s.value} ({s.pct.toFixed(0)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
