import { useState } from 'react';
import { useStore } from '../store';
import type { LoggedExercise, RepRange, Routine, SetEntry } from '../types';
import { bestEstimated1RM, previousExercisePoint } from '../lib/stats';

// Hypertrophy-oriented rep targets to choose from when starting a workout.
const REP_RANGES: RepRange[] = [
  { label: 'Heavy', low: 5, high: 8 },
  { label: 'Classic', low: 8, high: 12 },
  { label: 'Pump', low: 12, high: 15 },
];

export function WorkoutView() {
  const { data, startSession } = useStore();
  const [pending, setPending] = useState<Routine | null>(null);

  if (!data.activeSession) {
    if (pending) {
      return (
        <div className="view">
          <button className="link-back" onClick={() => setPending(null)}>
            ‹ Back
          </button>
          <h1>{pending.name}</h1>
          <p className="muted">Pick a rep range for this session</p>
          <div className="range-list">
            {REP_RANGES.map((r) => (
              <button
                key={r.label}
                className="range-card"
                onClick={() => {
                  startSession(pending, r);
                  setPending(null);
                }}
              >
                <span className="range-reps">
                  {r.low}–{r.high}
                </span>
                <span className="range-label">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="view">
        <h1>Start a workout</h1>
        <div className="routine-grid">
          {data.routines.map((r) => (
            <button key={r.id} className="routine-card" onClick={() => setPending(r)}>
              <span className="routine-card-name">{r.name}</span>
            </button>
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
  const { data, exerciseName, updateActive, finishSession, cancelSession, addExerciseToActive } =
    useStore();
  const [picking, setPicking] = useState(false);
  const session = data.activeSession!;
  const range = session.repRange;

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
            {completed} sets logged
            {range && (
              <>
                {' · '}
                <span className="range-chip">
                  {range.low}–{range.high} reps
                </span>
              </>
            )}
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
            repLow={range?.low}
            prev={previousExercisePoint(data.sessions, ex.exerciseId)}
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

function fmt(n: number | null | undefined): string {
  return n ? Math.round(n).toLocaleString() : '—';
}

function ExerciseCard({
  ex,
  name,
  repLow,
  prev,
  onChange,
  onAddSet,
  onRemoveSet,
}: {
  ex: LoggedExercise;
  name: string;
  repLow?: number;
  prev: { volume: number; best1RM: number } | null;
  onChange: (setIdx: number, patch: Partial<SetEntry>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
}) {
  const volActual = doneVolume(ex.sets);
  const volPlanned = enteredVolume(ex.sets);
  const strActual = bestEstimated1RM(ex.sets, true);
  const strPlanned = bestEstimated1RM(ex.sets, false);

  return (
    <div className="exercise-card">
      <div className="exercise-name">{name}</div>

      <div className="ex-stats">
        <div className="ex-stats-row head">
          <span />
          <span>Actual</span>
          <span>Planned</span>
          <span>Last</span>
        </div>
        <div className="ex-stats-row">
          <span className="k">Volume</span>
          <span className="a">{fmt(volActual)}</span>
          <span>{fmt(volPlanned)}</span>
          <span>{fmt(prev?.volume)}</span>
        </div>
        <div className="ex-stats-row">
          <span className="k">Strength</span>
          <span className="a">{fmt(strActual)}</span>
          <span>{fmt(strPlanned)}</span>
          <span>{fmt(prev?.best1RM)}</span>
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
            placeholder={repLow ? String(repLow) : '0'}
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
