import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { exerciseHistory, personalRecords, type PR } from '../lib/stats';
import { isGymDependent, sessionsForExercise } from '../lib/equipment';
import { LineChart } from './LineChart';

type Metric = 'best1RM' | 'topSet' | 'volume';

const METRIC_LABELS: Record<Metric, string> = {
  best1RM: 'Est. 1RM',
  topSet: 'Top set',
  volume: 'Volume',
};

export function ProgressView() {
  const { data, exerciseName, setCurrentGym } = useStore();
  const [metric, setMetric] = useState<Metric>('best1RM');

  // exercises that have any logged data
  const tracked = useMemo(() => {
    const ids = new Set<string>();
    for (const s of data.sessions) for (const e of s.exercises) ids.add(e.exerciseId);
    return [...ids];
  }, [data.sessions]);

  // PRs computed per exercise, gym-scoped for cable/machine
  const prs = useMemo(() => {
    const map = new Map<string, PR>();
    for (const id of tracked) {
      const sub = sessionsForExercise(data.sessions, id, data.currentGymId);
      const pr = personalRecords(sub).get(id);
      if (pr) map.set(id, pr);
    }
    return map;
  }, [data.sessions, tracked, data.currentGymId]);

  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? tracked[0] ?? null;

  if (tracked.length === 0) {
    return (
      <div className="view">
        <h1>Progress</h1>
        <p className="muted subtitle">Log some workouts to see your strength curves and bests.</p>
      </div>
    );
  }

  const sub = current ? sessionsForExercise(data.sessions, current, data.currentGymId) : [];
  const history = current ? exerciseHistory(sub, current) : [];
  const values = history.map((p) => p[metric]);
  const labels = history.map((p) => new Date(p.date).toLocaleDateString());
  const gymScoped = current ? isGymDependent(current) : false;

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

      {gymScoped && (
        <p className="muted small gym-note">
          Cable/machine — showing {data.gyms.find((g) => g.id === data.currentGymId)?.name}
        </p>
      )}

      <div className="metric-toggle">
        {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
          <button key={m} className={m === metric ? 'active' : ''} onClick={() => setMetric(m)}>
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

      <h2 className="section">Bests</h2>
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
