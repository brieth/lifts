import { useStore } from '../store';
import type { Emphasis, LoggedExercise, SetEntry } from '../types';
import { bestEstimated1RM, bestExercisePoint } from '../lib/stats';
import { EMPHASES, emphasisLabel, repsFor } from '../lib/reps';

export function WorkoutView() {
  const { data, startSession } = useStore();

  if (!data.activeSession) {
    return (
      <div className="view">
        <h1>Start a workout</h1>
        <p className="muted">Choose a rep emphasis to begin.</p>
        <div className="start-list">
          {data.routines.map((r) => (
            <div key={r.id} className="start-card">
              <span className="start-name">{r.name}</span>
              <div className="emphasis-row">
                {EMPHASES.map((e) => (
                  <button
                    key={e.id}
                    className="emphasis-btn"
                    onClick={() => startSession(r, e.id)}
                  >
                    <span className="lvl">{e.label}</span>
                    <small>{e.hint}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <ActiveSession />;
}

/** Volume of all sets that have weight and reps entered (whether or not done). */
function enteredVolume(sets: SetEntry[]): number {
  return sets.reduce((n, s) => (s.weight > 0 && s.reps > 0 ? n + s.weight * s.reps : n), 0);
}

/** Volume of only the sets marked done. */
function doneVolume(sets: SetEntry[]): number {
  return sets.reduce((n, s) => (s.done ? n + s.weight * s.reps : n), 0);
}

function ActiveSession() {
  const { data, exerciseName, updateActive, finishSession, cancelSession } = useStore();
  const session = data.activeSession!;
  const emphasis: Emphasis = session.emphasis ?? 'medium';

  function setSetValue(exIdx: number, setIdx: number, patch: Partial<SetEntry>) {
    updateActive((s) => {
      const exercises = s.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const sets = e.sets.map((st, j) => (j === setIdx ? { ...st, ...patch } : st));
        return { ...e, sets };
      });
      return { ...s, exercises };
    });
  }

  function addSet(exIdx: number) {
    updateActive((s) => {
      const exercises = s.exercises.map((e, i) => {
        if (i !== exIdx) return e;
        const last = e.sets[e.sets.length - 1];
        const seed: SetEntry = last
          ? { weight: last.weight, reps: last.reps, done: false }
          : { weight: 0, reps: 0, done: false };
        return { ...e, sets: [...e.sets, seed] };
      });
      return { ...s, exercises };
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    updateActive((s) => {
      const exercises = s.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e,
      );
      return { ...s, exercises };
    });
  }

  const completed = session.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0,
  );

  return (
    <div className="view">
      <div className="session-head">
        <div>
          <h1>{session.name}</h1>
          <p className="muted">
            {completed} sets logged{' · '}
            <span className="range-chip">{emphasisLabel(emphasis)} reps</span>
          </p>
        </div>
        <button className="btn ghost small" onClick={cancelSession}>
          Cancel
        </button>
      </div>

      <div className="exercise-list">
        {session.exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={`${ex.exerciseId}-${exIdx}`}
            ex={ex}
            name={exerciseName(ex.exerciseId)}
            targetReps={repsFor(ex.exerciseId, emphasis)}
            best={bestExercisePoint(data.sessions, ex.exerciseId)}
            onChange={(setIdx, patch) => setSetValue(exIdx, setIdx, patch)}
            onAddSet={() => addSet(exIdx)}
            onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
          />
        ))}
      </div>

      <button className="btn primary block finish" onClick={finishSession}>
        Finish workout
      </button>
    </div>
  );
}

function fmt(n: number | null | undefined): string {
  return n ? Math.round(n).toLocaleString() : '—';
}

function ExerciseCard({
  ex,
  name,
  targetReps,
  best,
  onChange,
  onAddSet,
  onRemoveSet,
}: {
  ex: LoggedExercise;
  name: string;
  targetReps: number;
  best: { volume: number; best1RM: number } | null;
  onChange: (setIdx: number, patch: Partial<SetEntry>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
}) {
  const volLogged = doneVolume(ex.sets);
  const volPlanned = enteredVolume(ex.sets);
  const strLogged = bestEstimated1RM(ex.sets, true);
  const strPlanned = bestEstimated1RM(ex.sets, false);

  return (
    <div className="exercise-card">
      <div className="exercise-head">
        <span className="exercise-name">{name}</span>
        <span className="target-chip">{targetReps} reps</span>
      </div>

      <div className="ex-stats">
        <div className="ex-stats-row head">
          <span />
          <span>Logged</span>
          <span>Planned</span>
          <span>Best</span>
        </div>
        <div className="ex-stats-row">
          <span className="k">Volume</span>
          <span className="a">{fmt(volLogged)}</span>
          <span>{fmt(volPlanned)}</span>
          <span>{fmt(best?.volume)}</span>
        </div>
        <div className="ex-stats-row">
          <span className="k">Strength</span>
          <span className="a">{fmt(strLogged)}</span>
          <span>{fmt(strPlanned)}</span>
          <span>{fmt(best?.best1RM)}</span>
        </div>
      </div>

      <div className="set-header">
        <span>Set</span>
        <span>lb</span>
        <span>Reps</span>
        <span>Done</span>
        <span />
      </div>
      {ex.sets.map((s, i) => (
        <div key={i} className={`set-row ${s.done ? 'done' : ''}`}>
          <span className="set-num">{i + 1}</span>
          <input
            type="number"
            inputMode="decimal"
            value={s.weight || ''}
            placeholder="0"
            onChange={(e) => onChange(i, { weight: Number(e.target.value) })}
          />
          <input
            type="number"
            inputMode="numeric"
            value={s.reps || ''}
            placeholder={String(targetReps)}
            onChange={(e) => onChange(i, { reps: Number(e.target.value) })}
          />
          <button
            className={`check ${s.done ? 'on' : ''}`}
            onClick={() => onChange(i, { done: !s.done })}
            aria-label="Mark set done"
          >
            ✓
          </button>
          <button className="set-remove" onClick={() => onRemoveSet(i)} aria-label="Remove set">
            ×
          </button>
        </div>
      ))}
      <button className="btn ghost small addset" onClick={onAddSet}>
        + Add set
      </button>
    </div>
  );
}
