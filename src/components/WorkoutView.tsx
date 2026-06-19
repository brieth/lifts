import { useStore } from '../store';
import type { Emphasis, LoggedExercise, SetEntry } from '../types';
import {
  bestEstimated1RM,
  bestExercisePoint,
  estimated1RM,
  recentEstimated1RM,
  weightForReps,
} from '../lib/stats';
import { defaultWeightFor, EMPHASES, emphasisLabel, repsFor } from '../lib/reps';

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

/** Effective value: what's entered, else the suggested placeholder. */
function eff(entered: number, placeholder: number): number {
  return entered > 0 ? entered : placeholder;
}

/** Logged volume: only sets marked done, using their actual entered values. */
function loggedVolume(sets: SetEntry[]): number {
  return sets.reduce((n, s) => (s.done ? n + s.weight * s.reps : n), 0);
}

/** Planned volume: every set, filling blanks with the suggested weight/reps. */
function plannedVolume(sets: SetEntry[], weight: number, reps: number): number {
  return sets.reduce((n, s) => n + eff(s.weight, weight) * eff(s.reps, reps), 0);
}

/** Planned strength: best estimated 1RM across all sets, blanks filled in. */
function plannedStrength(sets: SetEntry[], weight: number, reps: number): number {
  let best = 0;
  for (const s of sets) best = Math.max(best, estimated1RM(eff(s.weight, weight), eff(s.reps, reps)));
  return Math.round(best);
}

function round5(n: number): number {
  return Math.round(n / 5) * 5;
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
        {session.exercises.map((ex, exIdx) => {
          const targetReps = repsFor(ex.exerciseId, emphasis);
          const recent1RM = recentEstimated1RM(data.sessions, ex.exerciseId);
          const suggestedWeight = recent1RM
            ? round5(weightForReps(recent1RM, targetReps))
            : defaultWeightFor(ex.exerciseId);
          return (
            <ExerciseCard
              key={`${ex.exerciseId}-${exIdx}`}
              ex={ex}
              name={exerciseName(ex.exerciseId)}
              targetReps={targetReps}
              suggestedWeight={suggestedWeight}
              best={bestExercisePoint(data.sessions, ex.exerciseId)}
              onChange={(setIdx, patch) => setSetValue(exIdx, setIdx, patch)}
              onAddSet={() => addSet(exIdx)}
              onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
            />
          );
        })}
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
  suggestedWeight,
  best,
  onChange,
  onAddSet,
  onRemoveSet,
}: {
  ex: LoggedExercise;
  name: string;
  targetReps: number;
  suggestedWeight: number;
  best: { volume: number; best1RM: number } | null;
  onChange: (setIdx: number, patch: Partial<SetEntry>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
}) {
  const volLogged = loggedVolume(ex.sets);
  const volPlanned = plannedVolume(ex.sets, suggestedWeight, targetReps);
  const strLogged = bestEstimated1RM(ex.sets, true);
  const strPlanned = plannedStrength(ex.sets, suggestedWeight, targetReps);

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
          <span className="k">Strength</span>
          <span className="a">{fmt(strLogged)}</span>
          <span>{fmt(strPlanned)}</span>
          <span>{fmt(best?.best1RM)}</span>
        </div>
        <div className="ex-stats-row">
          <span className="k">Volume</span>
          <span className="a">{fmt(volLogged)}</span>
          <span>{fmt(volPlanned)}</span>
          <span>{fmt(best?.volume)}</span>
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
            placeholder={String(suggestedWeight)}
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
