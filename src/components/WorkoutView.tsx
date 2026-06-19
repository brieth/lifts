import { useState } from 'react';
import { useStore } from '../store';
import type { LoggedExercise, SetEntry } from '../types';
import { RestTimer } from './RestTimer';

export function WorkoutView() {
  const { data, startSession, startEmptySession } = useStore();

  if (!data.activeSession) {
    return (
      <div className="view">
        <h1>Start a workout</h1>
        <p className="muted">Pick a day from the routine, or freestyle it.</p>
        <div className="routine-grid">
          {data.routines.map((r) => (
            <button key={r.id} className="routine-card" onClick={() => startSession(r)}>
              <span className="routine-card-name">{r.name}</span>
              <span className="routine-card-sub">{r.subtitle}</span>
              <span className="routine-card-count">{r.exercises.length} exercises</span>
            </button>
          ))}
        </div>
        <button className="btn ghost block" onClick={startEmptySession}>
          + Freestyle workout
        </button>
      </div>
    );
  }

  return <ActiveSession />;
}

function ActiveSession() {
  const { data, exerciseName, updateActive, finishSession, cancelSession, addExerciseToActive } =
    useStore();
  const [picking, setPicking] = useState(false);
  const session = data.activeSession!;

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
          <p className="muted">{completed} sets logged</p>
        </div>
        <button className="btn ghost small" onClick={cancelSession}>
          Cancel
        </button>
      </div>

      <RestTimer />

      <div className="exercise-list">
        {session.exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={`${ex.exerciseId}-${exIdx}`}
            ex={ex}
            name={exerciseName(ex.exerciseId)}
            prevSuperset={session.exercises[exIdx - 1]?.superset}
            onChange={(setIdx, patch) => setSetValue(exIdx, setIdx, patch)}
            onAddSet={() => addSet(exIdx)}
            onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
          />
        ))}
      </div>

      {picking ? (
        <ExercisePicker
          onPick={(id) => {
            addExerciseToActive(id);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <button className="btn ghost block" onClick={() => setPicking(true)}>
          + Add exercise
        </button>
      )}

      <button className="btn primary block finish" onClick={finishSession}>
        Finish workout
      </button>
    </div>
  );
}

function ExerciseCard({
  ex,
  name,
  prevSuperset,
  onChange,
  onAddSet,
  onRemoveSet,
}: {
  ex: LoggedExercise;
  name: string;
  prevSuperset?: string;
  onChange: (setIdx: number, patch: Partial<SetEntry>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
}) {
  const supersetStart = ex.superset && ex.superset !== prevSuperset;
  return (
    <div className={`exercise-card ${ex.superset ? 'in-superset' : ''}`}>
      {supersetStart && <div className="superset-tag">Superset {ex.superset}</div>}
      <div className="exercise-name">{name}</div>
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
            placeholder="0"
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

function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { data, upsertExercise } = useStore();
  const [q, setQ] = useState('');
  const filtered = data.exercises.filter((e) =>
    e.name.toLowerCase().includes(q.toLowerCase()),
  );

  function addCustom() {
    const name = q.trim();
    if (!name) return;
    const ex = upsertExercise(name);
    onPick(ex.id);
  }

  return (
    <div className="picker">
      <div className="picker-head">
        <input
          autoFocus
          placeholder="Search or add exercise…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn ghost small" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="picker-list">
        {filtered.map((e) => (
          <button key={e.id} className="picker-item" onClick={() => onPick(e.id)}>
            {e.name}
          </button>
        ))}
        {q.trim() && !filtered.some((e) => e.name.toLowerCase() === q.toLowerCase()) && (
          <button className="picker-item add" onClick={addCustom}>
            + Create “{q.trim()}”
          </button>
        )}
      </div>
    </div>
  );
}
