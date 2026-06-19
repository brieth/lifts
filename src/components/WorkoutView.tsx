import { useStore } from '../store';
import type { Emphasis, LoggedExercise, SetEntry } from '../types';
import {
  bestEstimated1RM,
  bestExercisePoint,
  estimated1RM,
  lastExercisePoint,
  recentEstimated1RM,
  weightForReps,
} from '../lib/stats';
import { defaultOneRMFor, EMPHASES, emphasisLabel, repsFor } from '../lib/reps';
import { sessionsForExercise } from '../lib/equipment';

export function WorkoutView() {
  const { data, startSession } = useStore();

  if (!data.activeSession) {
    return (
      <div className="view">
        <h1>Start a workout</h1>
        <p className="muted subtitle">Choose a rep emphasis to begin.</p>
        <GymBar />
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

function GymBar() {
  const { data, setCurrentGym, addGym } = useStore();
  function add() {
    const name = prompt('New gym name')?.trim();
    if (name) addGym(name);
  }
  return (
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
        <button className="gym-chip add" onClick={add}>
          + Add
        </button>
      </div>
    </div>
  );
}

/**
 * Per-set placeholders: start at the base value (suggested weight / target reps),
 * then match the most recent manually-entered value so subsequent sets suggest it.
 */
function weightPlaceholders(sets: SetEntry[], suggested: number): number[] {
  const out: number[] = [];
  let running = suggested;
  for (const s of sets) {
    out.push(running);
    if (s.weight > 0 && !s.autoWeight) running = s.weight;
  }
  return out;
}

function repPlaceholders(sets: SetEntry[], target: number): number[] {
  const out: number[] = [];
  let running = target;
  for (const s of sets) {
    out.push(running);
    if (s.reps > 0 && !s.autoReps) running = s.reps;
  }
  return out;
}

/** Logged volume: only sets marked done, using their actual entered values. */
function loggedVolume(sets: SetEntry[]): number {
  return sets.reduce((n, s) => (s.done ? n + s.weight * s.reps : n), 0);
}

/** Planned volume: every set, filling blanks with the per-set placeholder weight/reps. */
function plannedVolume(sets: SetEntry[], phWeights: number[], phReps: number[]): number {
  return sets.reduce(
    (n, s, i) => n + (s.weight > 0 ? s.weight : phWeights[i]) * (s.reps > 0 ? s.reps : phReps[i]),
    0,
  );
}

/** Planned strength: best estimated 1RM across all sets, blanks filled in. */
function plannedStrength(sets: SetEntry[], phWeights: number[], phReps: number[]): number {
  let best = 0;
  sets.forEach((s, i) => {
    best = Math.max(
      best,
      estimated1RM(s.weight > 0 ? s.weight : phWeights[i], s.reps > 0 ? s.reps : phReps[i]),
    );
  });
  return Math.round(best);
}

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

function ActiveSession() {
  const { data, exerciseName, updateActive, finishSession, cancelSession } = useStore();
  const session = data.activeSession!;
  const emphasis: Emphasis = session.emphasis ?? 'medium';
  const gymName = data.gyms.find((g) => g.id === session.gymId)?.name ?? null;

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
          <p className="muted subtitle">
            {completed} sets logged{' · '}
            {gymName && (
              <>
                <span className="range-chip">{gymName}</span>
                {' · '}
              </>
            )}
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
          // Cable/machine history is restricted to the current gym; free weights global.
          const hist = sessionsForExercise(data.sessions, ex.exerciseId, data.currentGymId);
          // Use the most recent est. 1RM, or a category default 1RM with no history.
          // Either way, derive the weight for the target reps via inverse-Epley.
          const base1RM =
            recentEstimated1RM(hist, ex.exerciseId) ?? defaultOneRMFor(ex.exerciseId);
          const suggestedWeight = round5(weightForReps(base1RM, targetReps));
          return (
            <ExerciseCard
              key={`${ex.exerciseId}-${exIdx}`}
              ex={ex}
              name={exerciseName(ex.exerciseId)}
              targetReps={targetReps}
              suggestedWeight={suggestedWeight}
              last={lastExercisePoint(hist, ex.exerciseId)}
              best={bestExercisePoint(hist, ex.exerciseId)}
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
  last,
  best,
  onChange,
  onAddSet,
  onRemoveSet,
}: {
  ex: LoggedExercise;
  name: string;
  targetReps: number;
  suggestedWeight: number;
  last: { volume: number; best1RM: number } | null;
  best: { volume: number; best1RM: number } | null;
  onChange: (setIdx: number, patch: Partial<SetEntry>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
}) {
  const phWeights = weightPlaceholders(ex.sets, suggestedWeight);
  const phReps = repPlaceholders(ex.sets, targetReps);
  const volLogged = loggedVolume(ex.sets);
  const volPlanned = plannedVolume(ex.sets, phWeights, phReps);
  const strLogged = bestEstimated1RM(ex.sets, true);
  const strPlanned = plannedStrength(ex.sets, phWeights, phReps);

  // Checking a set fills blanks from the placeholders (marked auto so they
  // light up as "used"); unchecking reverts those auto-filled values back to
  // placeholders, but keeps anything that was typed manually.
  function toggleDone(i: number, s: SetEntry) {
    if (s.done) {
      const patch: Partial<SetEntry> = { done: false };
      if (s.autoWeight) {
        patch.weight = 0;
        patch.autoWeight = false;
      }
      if (s.autoReps) {
        patch.reps = 0;
        patch.autoReps = false;
      }
      onChange(i, patch);
    } else {
      const patch: Partial<SetEntry> = { done: true };
      if (s.weight <= 0) {
        patch.weight = phWeights[i];
        patch.autoWeight = true;
      }
      if (s.reps <= 0) {
        patch.reps = phReps[i];
        patch.autoReps = true;
      }
      onChange(i, patch);
    }
  }

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
          <span>Last</span>
          <span>Best</span>
        </div>
        <div className="ex-stats-row">
          <span className="k">Strength</span>
          <span className="a">{fmt(strLogged)}</span>
          <span>{fmt(strPlanned)}</span>
          <span>{fmt(last?.best1RM)}</span>
          <span>{fmt(best?.best1RM)}</span>
        </div>
        <div className="ex-stats-row">
          <span className="k">Volume</span>
          <span className="a">{fmt(volLogged)}</span>
          <span>{fmt(volPlanned)}</span>
          <span>{fmt(last?.volume)}</span>
          <span>{fmt(best?.volume)}</span>
        </div>
      </div>

      <div className="set-header">
        <span>Set</span>
        <span>lb</span>
        <span>Reps</span>
        <span />
        <span />
      </div>
      {ex.sets.map((s, i) => (
        <div key={i} className={`set-row ${s.done ? 'done' : ''}`}>
          <span className="set-num">{i + 1}</span>
          <input
            type="number"
            inputMode="decimal"
            value={s.weight || ''}
            placeholder={String(phWeights[i])}
            onChange={(e) => onChange(i, { weight: Number(e.target.value), autoWeight: false })}
          />
          <input
            type="number"
            inputMode="numeric"
            value={s.reps || ''}
            placeholder={String(phReps[i])}
            onChange={(e) => onChange(i, { reps: Number(e.target.value), autoReps: false })}
          />
          <button
            className={`check ${s.done ? 'on' : ''}`}
            onClick={() => toggleDone(i, s)}
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
