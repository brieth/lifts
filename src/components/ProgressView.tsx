import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { exerciseHistory } from '../lib/stats';
import { sessionsForExercise } from '../lib/equipment';
import { LineChart } from './LineChart';
import { WeeklyMuscles } from './WeeklyMuscles';

type Metric = 'best1RM' | 'volume';

const METRIC_LABELS: Record<Metric, string> = {
  best1RM: 'Strength',
  volume: 'Volume',
};

export function ProgressView() {
  const { data, exerciseName, setCurrentGym } = useStore();
  const [metric, setMetric] = useState<Metric>('best1RM');
  const [selected, setSelected] = useState<string | null>(null);

  // exercises that have any logged data, alphabetical
  const tracked = useMemo(() => {
    const ids = new Set<string>();
    for (const s of data.sessions) for (const e of s.exercises) ids.add(e.exerciseId);
    return [...ids].sort((a, b) => exerciseName(a).localeCompare(exerciseName(b)));
  }, [data.sessions, exerciseName]);

  const current = selected ?? tracked[0] ?? null;

  if (tracked.length === 0) {
    return (
      <div className="view">
        <h1>Progress</h1>
        <p className="muted subtitle">Log some workouts to see your weekly volume and strength curves.</p>
      </div>
    );
  }

  const sub = current ? sessionsForExercise(data.sessions, current, data.currentGymId) : [];
  const history = current ? exerciseHistory(sub, current) : [];
  const values = history.map((p) => p[metric]);
  const labels = history.map((p) => new Date(p.date).toLocaleDateString());
  // Cumulative mean up to and including each session — the "bar you're beating".
  const meanValues = values.map((_, i) => {
    let sum = 0;
    for (let k = 0; k <= i; k++) sum += values[k];
    return sum / (i + 1);
  });

  return (
    <div className="view">
      <h1>Progress</h1>

      {data.gyms.length > 1 && (
        <div className="gym-bar">
          <span className="gym-label">Gym</span>
          <div className="gym-options">
            {data.gyms.map((g) => (
              <button
                key={g.id}
                className={g.id === data.currentGymId ? 'gym-chip active' : 'gym-chip'}
                onClick={() => setCurrentGym(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <select className="select" value={current ?? ''} onChange={(e) => setSelected(e.target.value)}>
        {tracked.map((id) => (
          <option key={id} value={id}>
            {exerciseName(id)}
          </option>
        ))}
      </select>

      <div className="metric-toggle">
        {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
          <button key={m} className={m === metric ? 'active' : ''} onClick={() => setMetric(m)}>
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        <LineChart values={values} mean={meanValues} labels={labels} />
        {values.length > 0 && (
          <>
            <div className="chart-legend">
              <span className="lg lg-data">{METRIC_LABELS[metric]}</span>
              <span className="lg lg-mean">Mean</span>
            </div>
            <div className="chart-stats">
              <span>
                <span className="cs-k">Last</span> <strong>{values[values.length - 1]}</strong>
              </span>
              <span>
                <span className="cs-k">Best</span> <strong>{Math.max(...values)}</strong>
              </span>
              <span className="cs-n">{history.length} sessions</span>
            </div>
          </>
        )}
      </div>

      <WeeklyMuscles />
    </div>
  );
}
