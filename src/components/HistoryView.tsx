import { useStore } from '../store';
import { sessionVolume } from '../lib/stats';

export function HistoryView() {
  const { data, exerciseName, deleteSession } = useStore();

  if (data.sessions.length === 0) {
    return (
      <div className="view">
        <h1>History</h1>
        <p className="muted">No workouts logged yet. Finish a session and it'll show up here.</p>
      </div>
    );
  }

  return (
    <div className="view">
      <h1>History</h1>
      <div className="history-list">
        {data.sessions.map((s) => {
          const date = new Date(s.date);
          const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
          return (
            <details key={s.id} className="history-card">
              <summary>
                <div>
                  <div className="history-name">{s.name}</div>
                  <div className="muted small">
                    {date.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {sets} sets · {Math.round(sessionVolume(s)).toLocaleString()} lb volume
                  </div>
                </div>
              </summary>
              <div className="history-body">
                {s.exercises.map((e, i) => (
                  <div key={i} className="history-exercise">
                    <div className="history-exercise-name">{exerciseName(e.exerciseId)}</div>
                    <div className="history-sets">
                      {e.sets.map((st, j) => (
                        <span key={j} className="history-set">
                          {st.weight}×{st.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="btn ghost small danger" onClick={() => deleteSession(s.id)}>
                  Delete
                </button>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
