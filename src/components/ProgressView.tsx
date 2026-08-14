import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { exerciseHistory, overallSeries, rollingMean } from '../lib/stats';
import { sessionsForExercise } from '../lib/equipment';
import { CURRENT_EXERCISE_IDS, isCurrentExercise } from '../seed';
import { LineChart } from './LineChart';
import { WeeklyMuscles } from './WeeklyMuscles';

export type Metric = 'best1RM' | 'volume';

// Sentinel id for the aggregate "Overall" series (a whole-body strength/volume index).
const OVERALL = '__overall__';

/**
 * Estimated 1RM at which a lift correlates with visibly muscular development.
 * Anchored to FFMI ~23 (about 165 lb of lean mass at 5'11"), which lands around
 * 1.4x bodyweight on bench at roughly 200 lb.
 *
 * Only defined for the flat barbell bench press: it's a standardized movement
 * with real population data behind it. Cable and machine loads vary too much
 * between gyms for a threshold to mean anything, and volume isn't a physique
 * correlate at all, so no other exercise or metric gets a line.
 */
const STRENGTH_GOALS: Record<string, number> = {
  'barbell-bench-press': 285,
};

const METRIC_LABELS: Record<Metric, string> = {
  best1RM: 'Strength',
  volume: 'Volume',
};

// View state (selected exercise + metric) is owned by the parent Shell so it
// survives tab switches, which unmount/remount this component.
export function ProgressView({
  metric,
  setMetric,
  selected,
  setSelected,
}: {
  metric: Metric;
  setMetric: (m: Metric) => void;
  selected: string | null;
  setSelected: (s: string | null) => void;
}) {
  const { data, exerciseName, setCurrentGym } = useStore();
  const [showGoal, setShowGoal] = useState(false);

  // exercises that both have logged data and still exist in the routine, alphabetical
  const tracked = useMemo(() => {
    const ids = new Set<string>();
    for (const s of data.sessions)
      for (const e of s.exercises) if (isCurrentExercise(e.exerciseId)) ids.add(e.exerciseId);
    return [...ids].sort((a, b) => exerciseName(a).localeCompare(exerciseName(b)));
  }, [data.sessions, exerciseName]);

  // Overall is the default; individual exercises follow it in the dropdown.
  const options = [OVERALL, ...tracked];
  const current = selected ?? OVERALL;
  // The chart needs finished-session history; the weekly muscle panel below
  // works off the active session too, so it always renders (even mid-first-workout).
  const hasHistory = tracked.length > 0;

  const history =
    current === OVERALL
      ? overallSeries(data.sessions, [...CURRENT_EXERCISE_IDS], data.currentGymId)
      : exerciseHistory(
          sessionsForExercise(data.sessions, current, data.currentGymId),
          current,
        );
  const values = history.map((p) => p[metric]);
  const labels = history.map((p) => new Date(p.date).toLocaleDateString());
  // Rolling mean over the trailing window: a gettable "floor" reference that
  // sits below Best, so it stays a beatable target on off days.
  const meanValues = rollingMean(values);
  // Goal line is strength-only, and only for lifts with a defensible threshold.
  const goal = metric === 'best1RM' ? STRENGTH_GOALS[current] : undefined;

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

      {hasHistory ? (
        <>
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
            <LineChart
              values={values}
              reference={meanValues}
              labels={labels}
              goal={showGoal ? goal : undefined}
            />
            {values.length > 0 && (
              <>
                <div className="chart-legend">
                  <span className="lg lg-data">{METRIC_LABELS[metric]}</span>
                  <span className="lg lg-mean">Mean</span>
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
        </>
      ) : (
        <p className="muted subtitle">Finish a workout to see your volume and strength curves.</p>
      )}

      <WeeklyMuscles />
    </div>
  );
}
