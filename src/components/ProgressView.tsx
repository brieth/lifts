import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { exerciseHistory, personalRecords } from '../lib/stats';
import { LineChart } from './LineChart';

type Metric = 'best1RM' | 'topSet' | 'volume';

const METRIC_LABELS: Record<Metric, string> = {
  best1RM: 'Est. 1RM',
  topSet: 'Top set',
  volume: 'Volume',
};

export function ProgressView() {
  const { data, exerciseName } = useStore();
  const [metric, setMetric] = useState<Metric>('best1RM');

  const prs = useMemo(() => personalRecords(data.sessions), [data.sessions]);

  // exercises that actually have logged data, most recently used first
  const tracked = useMemo(() => {
    const ids = new Set<string>();
    for (const s of data.sessions) for (const e of s.exercises) ids.add(e.exerciseId);
    return [...ids];
  }, [data.sessions]);

  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? tracked[0] ?? null;

  if (tracked.length === 0) {
    return (
      <div className="view">
        <h1>Progress</h1>
        <p className="muted">Log some workouts to see your strength curves and PRs.</p>
      </div>
    );
  }

  const history = current ? exerciseHistory(data.sessions, current) : [];
  const values = history.map((p) => p[metric]);
  const labels = history.map((p) => new Date(p.date).toLocaleDateString());

  return (
    <div className="view">
      <h1>Progress</h1>

      <select
        className="select"
        value={current ?? ''}
        onChange={(e) => setSelected(e.target.value)}
      >
        {tracked.map((id) => (
          <option key={id} value={id}>
            {exerciseName(id)}
          </option>
        ))}
      </select>

      <div className="metric-toggle">
        {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
          <button
            key={m}
            className={m === metric ? 'active' : ''}
            onClick={() => setMetric(m)}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        <LineChart values={values} labels={labels} />
        {values.length > 0 && (
          <div className="chart-stats">
            <span>
              now <strong>{values[values.length - 1]}</strong>
            </span>
            <span>
              best <strong>{Math.max(...values)}</strong>
            </span>
            <span>{history.length} sessions</span>
          </div>
        )}
      </div>

      <h2 className="section">Personal Records</h2>
      <div className="pr-list">
        {tracked.map((id) => {
          const pr = prs.get(id);
          if (!pr) return null;
          return (
            <div key={id} className="pr-row">
              <span className="pr-name">{exerciseName(id)}</span>
              <span className="pr-detail">
                {pr.weight}×{pr.reps}
                <span className="pr-1rm">~{pr.est1RM} 1RM</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
