import { useStore } from '../store';

export function RoutinesView() {
  const { data, exerciseName, resetAll } = useStore();

  return (
    <div className="view">
      <h1>Routine</h1>
      <p className="muted">The 200 lb Minimalist — 6 days, exercises only.</p>

      <div className="routine-detail-list">
        {data.routines.map((r) => (
          <div key={r.id} className="routine-detail">
            <div className="routine-detail-head">
              <span className="routine-detail-name">{r.name}</span>
              <span className="routine-detail-sub">{r.subtitle}</span>
            </div>
            <ol className="routine-exercises">
              {r.exercises.map((re, i) => {
                const prev = r.exercises[i - 1]?.superset;
                const supersetStart = re.superset && re.superset !== prev;
                return (
                  <li
                    key={`${re.exerciseId}-${i}`}
                    className={re.superset ? 'ss' : ''}
                  >
                    {supersetStart && (
                      <span className="ss-label">superset {re.superset}</span>
                    )}
                    <span className="re-name">{exerciseName(re.exerciseId)}</span>
                    <span className="re-target">
                      {re.targetSets}×{re.targetReps}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <h2 className="section">Data</h2>
      <button
        className="btn ghost block danger"
        onClick={() => {
          if (confirm('Reset all workouts and restore the default routine? This cannot be undone.'))
            resetAll();
        }}
      >
        Reset all data
      </button>
    </div>
  );
}
