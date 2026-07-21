import { useMemo } from 'react';
import { useStore } from '../store';
import { sessionVolume } from '../lib/stats';
import { MonthCalendar } from './MonthCalendar';

/** Stored ISO timestamp -> the YYYY-MM-DD a <input type="date"> expects (local). */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function HistoryView() {
  const { data, deleteSession, updateSessionExercise, updateSessionDate } = useStore();

  // all exercises, sorted by name, for the edit dropdowns
  const exerciseOptions = useMemo(
    () => [...data.exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [data.exercises],
  );

  // newest first; re-sorts live when a date is edited (ISO sorts chronologically)
  const sessions = useMemo(
    () => [...data.sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [data.sessions],
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
        {sessions.map((s) => {
          const date = new Date(s.date);
          const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
          return (
            <details key={s.id} className="history-card">
              <summary>
                <div>
                  <div className="history-name">{s.name}</div>
                  <div className="muted small">
                    <span className="history-date">
                      {date.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {/* transparent native picker over the readable text; editing
                          keeps the original time-of-day and only moves the date. */}
                      <input
                        type="date"
                        className="history-date-native"
                        value={toDateInput(s.date)}
                        onClick={(ev) => ev.stopPropagation()}
                        onChange={(ev) => {
                          if (!ev.target.value) return;
                          const [y, m, day] = ev.target.value.split('-').map(Number);
                          const nd = new Date(s.date);
                          nd.setFullYear(y, m - 1, day);
                          updateSessionDate(s.id, nd.toISOString());
                        }}
                      />
                    </span>{' '}
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
