import { useState } from 'react';
import {
  BODY_READINGS,
  ffmi,
  HEIGHT_LABEL,
  type BodyReading,
  type Insight,
  type Segments,
} from '../body';
import { LineChart } from './LineChart';

type Metric = 'weight' | 'leanBodyMass' | 'bodyFatMass' | 'bodyFatPct';

const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: 'weight', label: 'Weight', unit: 'lb' },
  { id: 'leanBodyMass', label: 'Lean', unit: 'lb' },
  { id: 'bodyFatMass', label: 'Fat', unit: 'lb' },
  { id: 'bodyFatPct', label: 'Body Fat', unit: '%' },
];

/** Which way is progress, so deltas can be coloured honestly. */
type Dir = 'up' | 'down' | 'neutral';

const fmtDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const num = (n: number, dp = 1) =>
  n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

function Delta({ value, dir, unit }: { value: number | null; dir: Dir; unit: string }) {
  if (value == null) return <span className="body-delta muted">first scan</span>;
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return <span className="body-delta muted">no change</span>;
  const good = dir === 'neutral' ? null : (rounded > 0) === (dir === 'up');
  const cls = good == null ? 'body-delta' : good ? 'body-delta good' : 'body-delta bad';
  return (
    <span className={cls}>
      {rounded > 0 ? '+' : ''}
      {num(rounded)} {unit}
    </span>
  );
}

function StatCard({
  label,
  value,
  unit,
  delta,
  dir,
}: {
  label: string;
  value: string;
  unit: string;
  delta: number | null;
  dir: Dir;
}) {
  return (
    <div className="body-stat">
      <span className="body-stat-label">{label}</span>
      <strong className="body-stat-value">
        {value}
        <small>{unit}</small>
      </strong>
      <Delta value={delta} dir={dir} unit={unit} />
    </div>
  );
}

function InsightBlock({ insight }: { insight: Insight }) {
  return (
    <div className="insight">
      <p className="insight-headline">{insight.headline}</p>
      {insight.points.map((p, i) => (
        <p key={i} className="insight-point">
          {p}
        </p>
      ))}
    </div>
  );
}

function SegmentTable({ title, seg, unit }: { title: string; seg: Segments; unit: string }) {
  const rows: [string, number][] = [
    ['Right arm', seg.rightArm],
    ['Left arm', seg.leftArm],
    ['Trunk', seg.trunk],
    ['Right leg', seg.rightLeg],
    ['Left leg', seg.leftLeg],
  ];
  const max = Math.max(...rows.map(([, v]) => v));
  return (
    <div className="seg-block">
      <h2 className="section">{title}</h2>
      {rows.map(([name, v]) => (
        <div key={name} className="seg-row">
          <span className="seg-name">{name}</span>
          <div className="seg-track">
            <div className="seg-fill" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <strong className="seg-val">
            {num(v)}
            <small>{unit}</small>
          </strong>
        </div>
      ))}
    </div>
  );
}

export function BodyView() {
  const [metric, setMetric] = useState<Metric>('leanBodyMass');
  const readings = BODY_READINGS;

  if (readings.length === 0) {
    return (
      <div className="view">
        <h1>Body</h1>
        <p className="muted subtitle">No scans recorded yet.</p>
      </div>
    );
  }

  const latest = readings[readings.length - 1];
  const prev = readings.length > 1 ? readings[readings.length - 2] : null;
  const d = (f: (r: BodyReading) => number) => (prev ? f(latest) - f(prev) : null);

  const values = readings.map((r) => r[metric]);
  const labels = readings.map((r) => fmtDate(r.date));
  const active = METRICS.find((m) => m.id === metric)!;

  return (
    <div className="view">
      <h1>Body</h1>
      <p className="muted subtitle session-meta">
        <span className="range-chip">{fmtDate(latest.date)}</span>
        <span className="range-chip">{latest.source}</span>
      </p>

      <div className="body-stats">
        <StatCard
          label="Weight"
          value={num(latest.weight)}
          unit="lb"
          delta={d((r) => r.weight)}
          dir="neutral"
        />
        <StatCard
          label="Lean mass"
          value={num(latest.leanBodyMass)}
          unit="lb"
          delta={d((r) => r.leanBodyMass)}
          dir="up"
        />
        <StatCard
          label="Fat mass"
          value={num(latest.bodyFatMass)}
          unit="lb"
          delta={d((r) => r.bodyFatMass)}
          dir="down"
        />
        <StatCard
          label="Body fat"
          value={num(latest.bodyFatPct)}
          unit="%"
          delta={d((r) => r.bodyFatPct)}
          dir="down"
        />
        <StatCard
          label="Muscle (SMM)"
          value={num(latest.skeletalMuscleMass)}
          unit="lb"
          delta={d((r) => r.skeletalMuscleMass)}
          dir="up"
        />
        <StatCard
          label="FFMI"
          value={num(ffmi(latest))}
          unit=""
          delta={d(ffmi)}
          dir="up"
        />
      </div>

      <div className="metric-toggle">
        {METRICS.map((m) => (
          <button
            key={m.id}
            className={m.id === metric ? 'active' : ''}
            onClick={() => setMetric(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        <LineChart values={values} labels={labels} />
        <div className="chart-stats">
          <span>
            <span className="cs-k">Latest</span>{' '}
            <strong>
              {num(values[values.length - 1])} {active.unit}
            </strong>
          </span>
          <span className="cs-n">
            {readings.length} scan{readings.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {latest.segmentalLean && (
        <SegmentTable title="Segmental lean" seg={latest.segmentalLean} unit="lb" />
      )}

      {latest.insight && (
        <>
          <h2 className="section">Analysis</h2>
          <InsightBlock insight={latest.insight} />
        </>
      )}

      <h2 className="section">Scans</h2>
      <div className="history-list">
        {[...readings].reverse().map((r) => (
          <details key={r.date} className="history-card">
            <summary>
              <div>
                <div className="history-name">{fmtDate(r.date)}</div>
                <div className="muted small">
                  {num(r.weight)} lb · {num(r.bodyFatPct)}% fat · {num(r.leanBodyMass)} lb lean
                </div>
              </div>
            </summary>
            <div className="history-body">
              <div className="body-detail">
                {(
                  [
                    ['Source', r.source],
                    ['Height', HEIGHT_LABEL],
                    ['Weight', `${num(r.weight)} lb`],
                    ['Lean body mass', `${num(r.leanBodyMass)} lb`],
                    ['Skeletal muscle', `${num(r.skeletalMuscleMass)} lb`],
                    ['Body fat mass', `${num(r.bodyFatMass)} lb`],
                    ['Body fat', `${num(r.bodyFatPct)}%`],
                    ['FFMI', num(ffmi(r), 2)],
                    ['BMI', num(r.bmi)],
                    ['BMR', `${r.bmr.toLocaleString()} kcal`],
                    r.totalBodyWater && ['Total body water', `${num(r.totalBodyWater)} lb`],
                    r.dryLeanMass && ['Dry lean mass', `${num(r.dryLeanMass)} lb`],
                    r.ecwTbw && ['ECW/TBW', num(r.ecwTbw, 3)],
                    r.visceralFat && ['Visceral fat', String(r.visceralFat)],
                    r.smi && ['SMI', `${num(r.smi)} kg/m²`],
                    r.waistHipRatio && ['Waist-hip ratio', num(r.waistHipRatio, 2)],
                    r.fitnessScore && ['Fitness score', String(r.fitnessScore)],
                  ].filter(Boolean) as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="body-detail-row">
                    <span className="muted small">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              {r.insight && <InsightBlock insight={r.insight} />}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
