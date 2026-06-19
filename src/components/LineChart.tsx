interface Props {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
}

/** Lightweight dependency-free SVG line chart. */
export function LineChart({ values, labels, height = 160, color = '#2dd4bf' }: Props) {
  const width = 320;
  const padX = 8;
  const padY = 16;

  if (values.length === 0) {
    return <div className="chart-empty">No data yet</div>;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const x = (i: number) =>
    values.length === 1 ? width / 2 : padX + (i / (values.length - 1)) * innerW;
  const y = (v: number) => padY + innerH - ((v - min) / span) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPoints = `${padX},${padY + innerH} ${points} ${padX + innerW},${padY + innerH}`;

  return (
    <svg
      className="linechart"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
    >
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
    </svg>
  );
}
