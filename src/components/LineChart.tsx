interface Props {
  values: number[];
  labels?: string[];
  color?: string;
}

const fmtNum = (n: number) => Math.round(n).toLocaleString();

/** Lightweight dependency-free SVG line chart with axis gridlines and labels. */
export function LineChart({ values, labels, color = '#2dd4bf' }: Props) {
  if (values.length === 0) {
    return <div className="chart-empty">No data yet</div>;
  }

  const W = 320;
  const H = 180;
  const padL = 38;
  const padR = 10;
  const padT = 12;
  const padB = 22;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const x = (i: number) =>
    values.length === 1 ? padL + innerW / 2 : padL + (i / (values.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - ((v - min) / span) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPoints = `${x(0)},${padT + innerH} ${points} ${x(values.length - 1)},${padT + innerH}`;

  // horizontal gridline values (max / middle / min), relative to the data
  const ticks = max === min ? [max] : [max, (max + min) / 2, min];

  return (
    <svg className="linechart" viewBox={`0 0 ${W} ${H}`} role="img">
      {ticks.map((tv, k) => {
        const ty = y(tv);
        return (
          <g key={k}>
            <line x1={padL} y1={ty} x2={W - padR} y2={ty} stroke="var(--border)" strokeWidth={1} />
            <text
              x={padL - 6}
              y={ty}
              textAnchor="end"
              dominantBaseline="central"
              className="chart-axis"
            >
              {fmtNum(tv)}
            </text>
          </g>
        );
      })}

      <polygon points={areaPoints} fill={color} opacity={0.12} />
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

      {labels && labels.length > 0 && (
        <>
          <text x={padL} y={H - 6} textAnchor="start" className="chart-axis">
            {labels[0]}
          </text>
          {labels.length > 1 && (
            <text x={W - padR} y={H - 6} textAnchor="end" className="chart-axis">
              {labels[labels.length - 1]}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
