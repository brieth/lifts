import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { exerciseHistory, overallSeries, rollingQ3 } from '../lib/stats';
import { sessionsForExercise } from '../lib/equipment';
import { LineChart } from './LineChart';
import { WeeklyMuscles } from './WeeklyMuscles';

type Metric = 'best1RM' | 'volume';

// Sentinel id for the aggregate "Overall" series (a whole-body strength/volume index).
const OVERALL = '__overall__';

const METRIC_LABELS: Record<Metric, string> = {
  best1RM: 'Strength',
  volume: 'Volume',
};

export function ProgressView() {
  const { data, exerciseName, setCurrentGym } = useStore();
  const [metric, setMetric] = useState<Metric>('best1RM');
  const [selected, setSelected] = useState<string | null>(null);

  // ids reachable in the current program: every routine slot plus all of its
  // menu options (leg + ab menus), so phased-out exercises are excluded.
  const currentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of data.routines) {
      for (const e of r.exercises) {
        if (e.exerciseId) ids.add(e.exerciseId);
        for (const id of e.options ?? []) ids.add(id);
      }
    }
    return ids;
  }, [data.routines]);

  // exercises that both have logged data and still exist in the routine, alphabetical
  const tracked = useMemo(() => {
    const ids = new Set<string>();
    for (const s of data.sessions)
      for (const e of s.exercises) if (currentIds.has(e.exerciseId)) ids.add(e.exerciseId);
    return [...ids].sort((a, b) => exerciseName(a).localeCompare(exerciseName(b)));
  }, [data.sessions, currentIds, exerciseName]);

  // Overall is the default; individual exercises follow it in the dropdown.
  const options = [OVERALL, ...tracked];
  const current = selected ?? OVERALL;

  if (tracked.length === 0) {
    return (
      <div className="view">
        <h1>Progress</h1>
        <p className="muted subtitle">Log some workouts to see your weekly volume and strength curves.</p>
      </div>
    );
  }

  const history =
    current === OVERALL
      ? overallSeries(data.sessions, [...currentIds], data.currentGymId)
      : exerciseHistory(
          sessionsForExercise(data.sessions, current, data.currentGymId),
          current,
        );
  const values = history.map((p) => p[metric]);
  const labels = history.map((p) => new Date(p.date).toLocaleDateString());
  // Rolling Q3: a competitive, outlier-resistant reference line (top quarter of
  // the trailing window), replacing the old cumulative mean.
  const q3Values = rollingQ3(values);

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

      <select className="select" value={current} onChange={(e) => setSelected(e.target.value)}>
        {options.map((id) => (
          <option key={id} value={id}>
            {id === OVERALL ? 'Overall' : exerciseName(id)}
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
        <LineChart values={values} reference={q3Values} labels={labels} />
        {values.length > 0 && (
          <>
            <div className="chart-legend">
              <span className="lg lg-data">{METRIC_LABELS[metric]}</span>
              <span className="lg lg-mean">Q3</span>
            </div>
            <div className="chart-stats">
              <span>
                <span className="cs-k">Last</span>{' '}
                <strong>{values[values.length - 1].toLocaleString()}</strong>
              </span>
              <span>
                <span className="cs-k">Best</span>{' '}
                <strong>{Math.max(...values).toLocaleString()}</strong>
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
