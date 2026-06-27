/**
 * Small round badge for the Strength / Volume labels: a filled teal inner disc,
 * a transparent gap, then a teal outline ring. The letter is centered via SVG
 * text-anchor/dominant-baseline (reliable optical centering).
 */
export function SvBadge({ letter }: { letter: 'S' | 'V' }) {
  return (
    <svg
      className="sv-badge"
      viewBox="0 0 24 24"
      role="img"
      aria-label={letter === 'S' ? 'Strength' : 'Volume'}
    >
      <circle cx="12" cy="12" r="10.6" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="7.2" fill="var(--accent)" />
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fill="var(--bg)">
        {letter}
      </text>
    </svg>
  );
}
