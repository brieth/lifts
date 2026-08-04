interface Props {
  values: number[];
  /**
   * Optional reference series (same length as values), drawn as a dashed white
   * line. Entries may be null and are skipped.
   */
  reference?: (number | null)[];
  /** Per-point labels — used for point tooltips only (no x-axis text). */
  labels?: string[];
  color?: string;
}

/**
 * Axis/tooltip formatting. Narrow ranges (body composition, light isolations)
 * need a decimal or the tick labels collapse into duplicates; wide ones read
 * better as whole numbers.
 */
const fmtNum = (n: number, span = Infinity) =>
  span < 10
    ? n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : Math.round(n).toLocaleString();
const REFERENCE_COLOR = '#ffffff';

/** Lightweight dependency-free SVG line chart with axis gridlines and labels. */
export function LineChart({ values, reference, labels, color = '#2dd4bf' }: Props) {
  if (values.length === 0) {
    return <div className="chart-empty">No data yet</div>;
  }

  const W = 320;
  const H = 180;
  // Left gutter holds the flush-left y-axis numbers. The other three insets are
  // just enough that the axis numbers (top/bottom) and the end dots sit AT the
  // SVG edge — so every side's only margin is the card's uniform padding, with
  // nothing spilling past it.
  const padL = 22;
  const padR = 3;
  const padT = 4;
  const padB = 4;

  // Scale over both series so the reference line always fits.
  const refNums = reference ? reference.filter((v): v is number => v != null) : [];
  const all = refNums.length ? values.concat(refNums) : values;
  const max = Math.max(...all);
  const min = Math.min(...all);
  const span = max - min || 1;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // The reference series may carry one extra (forward) point, so x-spacing spans
  // the longer of the two series.
  const count = Math.max(values.length, reference ? reference.length : 0);
  const x = (i: number) =>
    count <= 1 ? padL + innerW / 2 : padL + (i / (count - 1)) * innerW;
  const y = (v: number) => padT + innerH - ((v - min) / span) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPoints = `${x(0)},${padT + innerH} ${points} ${x(values.length - 1)},${padT + innerH}`;
  const refPoints = reference
    ? reference
        .map((v, i) => (v == null ? null : `${x(i)},${y(v)}`))
        .filter((p): p is string => p != null)
        .join(' ')
    : '';

  // horizontal gridline values (max / middle / min), relative to the data
  const ticks = max === min ? [max] : [max, (max + min) / 2, min];

  return (
    <svg className="linechart" viewBox={`0 0 ${W} ${H}`} role="img">
      {ticks.map((tv, k) => {
        const ty = y(tv);
        return (
          <g key={k}>
            <line x1={padL} y1={ty} x2={W - padR} y2={ty} stroke="var(--border)" strokeWidth={1} />
            <text x={0} y={ty} textAnchor="start" dominantBaseline="central" className="chart-axis">
              {fmtNum(tv, max - min)}
            </text>
          </g>
        );
      })}

      <polygon points={areaPoints} fill={color} opacity={0.12} />

      {refPoints && (
        <polyline
          points={refPoints}
          fill="none"
          stroke={REFERENCE_COLOR}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.85}
        />
      )}

      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={color}>
          <title>
            {labels?.[i] ? `${labels[i]}: ` : ''}
            {fmtNum(v, max - min)}
          </title>
        </circle>
      ))}
    </svg>
  );
}
