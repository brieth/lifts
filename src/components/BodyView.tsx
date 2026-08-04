import { useState } from 'react';
import {
  BODY_READINGS,
  ffmi,
  FFMI_GOAL,
  HEIGHT_LABEL,
  LEAN_GOAL,
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

/** A headline stat, with a plain-language explanation shown on tap. */
interface StatDef {
  label: string;
  unit: string;
  dir: Dir;
  value: (r: BodyReading) => number;
  /** Decimal places for display. */
  dp?: number;
  explain: string[];
}

const STATS: StatDef[] = [
  {
    label: 'Weight',
    unit: 'lb',
    dir: 'neutral',
    value: (r) => r.weight,
    explain: [
      'Your total body weight. Everything, all at once.',
      'On its own it says nothing about what that weight is made of, which is why the delta here is never coloured good or bad. Two people at 177 lb can look completely different depending on the split between muscle and fat.',
      'Its real use is confirming whether you are eating at maintenance. If weight holds steady while you train hard, your calories are roughly balanced. If it climbs, you are in a surplus whether you intended one or not.',
    ],
  },
  {
    label: 'Lean mass',
    unit: 'lb',
    dir: 'up',
    value: (r) => r.leanBodyMass,
    explain: [
      'Everything in your body that is not fat: muscle, organs, bone, and the water held in all of it. Also called fat-free mass.',
      'This is the number that matters most for looking muscular, because it is the tissue you are trying to add. Organs and bone barely change, so movement in this number is mostly muscle.',
      'The catch is that it is heavily influenced by hydration. A single scan carries roughly 4 lb of error, so ignore any change smaller than that unless repeated scans point the same way.',
    ],
  },
  {
    label: 'Fat mass',
    unit: 'lb',
    dir: 'down',
    value: (r) => r.bodyFatMass,
    explain: [
      'The total weight of fat on your body, in pounds.',
      'This is more useful for tracking than the body fat percentage, because it isolates a single variable. If this number falls, you lost fat. Nothing else can explain it.',
    ],
  },
  {
    label: 'Body fat',
    unit: '%',
    dir: 'down',
    value: (r) => r.bodyFatPct,
    explain: [
      'Your fat mass expressed as a share of your total weight.',
      'It matters because it determines whether the muscle you have is actually visible. Definition, abdominal separation, and vascularity are all functions of this number rather than of how much muscle you carry.',
      'Read it carefully though, because it is a ratio and moves whenever either side changes. Gaining muscle lowers your body fat percentage without you losing a single pound of fat. That is why fat mass above is the cleaner number to track.',
    ],
  },
  {
    label: 'Muscle (SMM)',
    unit: 'lb',
    dir: 'up',
    value: (r) => r.skeletalMuscleMass,
    explain: [
      'Skeletal muscle mass: only the muscle attached to your skeleton, which is the tissue you actually train.',
      'It is narrower than lean mass, which also counts organs, bone and water. Skeletal muscle is normally a bit over half of your lean mass.',
      'In principle this is the most directly relevant number in the whole panel. In practice it is derived from the same impedance reading as lean mass, so it carries the same hydration error and moves in step with it.',
    ],
  },
  {
    label: `FFMI / ${FFMI_GOAL}`,
    unit: '',
    dir: 'up',
    value: ffmi,
    dp: 1,
    explain: [
      'Fat-free mass index. Your lean mass divided by your height squared. Think of it as BMI, except it counts only lean tissue.',
      'This exists because BMI cannot tell muscle from fat. Your BMI of 24.8 reads as perfectly normal, but it is treating 34 lb of fat as though it were the same thing as muscle. FFMI throws the fat out and asks one question: how much lean tissue do you carry for your height?',
      'The scale for men runs roughly 18 to 19 for untrained, 20 to 21 for someone who trains and looks fit, 22 to 23 for clearly muscular, 24 to 25 near the natural ceiling, and 26 or above usually indicating enhancement.',
      `The goal of ${FFMI_GOAL} shown here is the level where the look you are after tends to appear, and it works out to ${LEAN_GOAL} lb of lean mass at your height. It is the sturdiest target in the app, because unlike a lift it cannot be reached through better technique.`,
    ],
  },
];

function StatCard({
  def,
  latest,
  delta,
  onOpen,
}: {
  def: StatDef;
  latest: BodyReading;
  delta: number | null;
  onOpen: () => void;
}) {
  return (
    <button className="body-stat" onClick={onOpen}>
      <span className="body-stat-label">{def.label}</span>
      <strong className="body-stat-value">
        {num(def.value(latest), def.dp ?? 1)}
        <small>{def.unit}</small>
      </strong>
      <Delta value={delta} dir={def.dir} unit={def.unit} />
    </button>
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
  const [showGoal, setShowGoal] = useState(false);
  const [explain, setExplain] = useState<number | null>(null);
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
  // Only lean mass gets a target. Fat mass and body fat depend on whether you're
  // cutting, and a bare weight target says nothing about what the weight is.
  const goal = metric === 'leanBodyMass' ? LEAN_GOAL : undefined;

  return (
    <div className="view">
      <h1>Body</h1>
      <p className="muted subtitle session-meta">
        <span className="range-chip">{fmtDate(latest.date)}</span>
        <span className="range-chip">{latest.source}</span>
      </p>

      <div className="body-stats">
        {STATS.map((s, i) => (
          <StatCard
            key={s.label}
            def={s}
            latest={latest}
            delta={d(s.value)}
            onOpen={() => setExplain(i)}
          />
        ))}
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
        <LineChart values={values} labels={labels} goal={showGoal ? goal : undefined} />
        <div className="chart-legend">
          <span className="lg lg-data">{active.label}</span>
          {goal != null && (
            <button
              className={showGoal ? 'goal-toggle active' : 'goal-toggle'}
              onClick={() => setShowGoal((s) => !s)}
            >
              Goal {goal.toLocaleString()}
            </button>
          )}
        </div>
        <div className="chart-stats">
          <span>
            <span className="cs-k">Last</span>{' '}
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

      {explain != null && (
        <div className="modal-overlay" onClick={() => setExplain(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">{STATS[explain].label}</span>
              <button className="btn ghost small" onClick={() => setExplain(null)}>
                Close
              </button>
            </div>
            <p className="stat-explain-value">
              {num(STATS[explain].value(latest), STATS[explain].dp ?? 1)}
              <small>{STATS[explain].unit}</small>
            </p>
            {STATS[explain].explain.map((p, i) => (
              <p key={i} className="insight-point">
                {p}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
