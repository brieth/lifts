interface Props {
  values: number[];
  /**
   * Optional mean series (same length as values), drawn in white. Entries may be
   * null (e.g. the first session has no prior mean) and are skipped.
   */
  mean?: (number | null)[];
  /** Per-point labels — used for point tooltips only (no x-axis text). */
  labels?: string[];
  color?: string;
}

const fmtNum = (n: number) => Math.round(n).toLocaleString();
const MEAN_COLOR = '#ffffff';

/** Lightweight dependency-free SVG line chart with axis gridlines and labels. */
export function LineChart({ values, mean, labels, color = '#2dd4bf' }: Props) {
  if (values.length === 0) {
    return <div className="chart-empty">No data yet</div>;
  }

  const W = 320;
  const H = 180;
  // Left gutter holds the flush-left y-axis numbers; the plot then runs nearly
  // to the right edge so the chart fills the card uniformly. Equal top/bottom.
  const padL = 22;
  const padR = 6;
  const padT = 10;
  const padB = 10;

  // Scale over both series so the mean line always fits.
  const meanNums = mean ? mean.filter((v): v is number => v != null) : [];
  const all = meanNums.length ? values.concat(meanNums) : values;
  const max = Math.max(...all);
  const min = Math.min(...all);
  const span = max - min || 1;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const x = (i: number) =>
    values.length === 1 ? padL + innerW / 2 : padL + (i / (values.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - ((v - min) / span) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPoints = `${x(0)},${padT + innerH} ${points} ${x(values.length - 1)},${padT + innerH}`;
  const meanPoints = mean
    ? mean
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
              {fmtNum(tv)}
            </text>
          </g>
        );
      })}

      <polygon points={areaPoints} fill={color} opacity={0.12} />

      {meanPoints && (
        <polyline
          points={meanPoints}
          fill="none"
          stroke={MEAN_COLOR}
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
            {v}
          </title>
        </circle>
      ))}
    </svg>
  );
}
