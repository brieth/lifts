import { useMemo } from 'react';
import { useStore } from '../store';
import { sessionVolume } from '../lib/stats';
import { MonthCalendar } from './MonthCalendar';

export function HistoryView() {
  const { data, deleteSession, updateSessionExercise } = useStore();

  // all exercises, sorted by name, for the edit dropdowns
  const exerciseOptions = useMemo(
    () => [...data.exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [data.exercises],
  );

  return (
    <div className="view">
      <h1>History</h1>
      <MonthCalendar />
      {data.sessions.length === 0 ? (
        <p className="muted subtitle">
          No workouts logged yet. Finish a session and it'll show up here.
        </p>
      ) : (
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
                    <select
                      className="history-exercise-select"
                      value={e.exerciseId}
                      onChange={(ev) => updateSessionExercise(s.id, i, ev.target.value)}
                    >
                      {exerciseOptions.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
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
      )}
    </div>
  );
}
