import { useState } from 'react';
import { useStore } from '../store';
import type { Emphasis, LoggedExercise, SetEntry } from '../types';
import {
  bestEstimated1RM,
  bestExercisePoint,
  estimated1RM,
  meanExercisePoint,
  recentEstimated1RM,
  weightForReps,
} from '../lib/stats';
import { defaultOneRMFor, EMPHASES, emphasisLabel, repsFor } from '../lib/reps';
import { sessionsForExercise } from '../lib/equipment';
import { AB_OPTION_IDS } from '../seed';
import { SvBadge } from './SvBadge';

export function WorkoutView() {
  const { data, startSession } = useStore();

  if (!data.activeSession) {
    return (
      <div className="view">
        <h1>Start a workout</h1>
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
  const [historyFor, setHistoryFor] = useState<string | null>(null);
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

  function handleFinish() {
    // Count planned sets that aren't checked off, across selected exercises only
    // (empty menu slots don't count). These would be silently dropped on finish.
    const unlogged = session.exercises.reduce(
      (n, e) => (e.exerciseId ? n + e.sets.filter((s) => !s.done).length : n),
      0,
    );
    if (unlogged > 0) {
      const setWord = unlogged === 1 ? 'set' : 'sets';
      const verb = unlogged === 1 ? "isn't" : "aren't";
      const ok = window.confirm(
        `${unlogged} ${setWord} ${verb} logged and won't be saved. Finish anyway?`,
      );
      if (!ok) return;
    }
    finishSession();
  }

  function changeExercise(exIdx: number, exerciseId: string) {
    updateActive((s) => {
      const slot = s.exercises[exIdx];
      let exercises = s.exercises.map((e, i) => (i === exIdx ? { ...e, exerciseId } : e));
      if (slot.options) {
        if (exerciseId) {
          // Selected a leg exercise: ensure an empty leg slot follows it.
          const next = exercises[exIdx + 1];
          const hasTrailingEmpty = next && next.options && !next.exerciseId;
          if (!hasTrailingEmpty) {
            const empty: LoggedExercise = {
              exerciseId: '',
              options: slot.options,
              sets: [
                { weight: 0, reps: 0, done: false },
                { weight: 0, reps: 0, done: false },
                { weight: 0, reps: 0, done: false },
              ],
            };
            exercises = [...exercises.slice(0, exIdx + 1), empty, ...exercises.slice(exIdx + 1)];
          }
        } else {
          // Cleared a leg exercise: drop this slot as long as another empty one remains.
          const otherEmpty = exercises.some(
            (e, i) => i !== exIdx && e.options && !e.exerciseId,
          );
          if (otherEmpty) exercises = exercises.filter((_, i) => i !== exIdx);
        }
      }
      return { ...s, exercises };
    });
  }

  return (
    <div className="view">
      <div className="session-head">
        <div>
          <h1>{session.name}</h1>
          <p className="muted subtitle session-meta">
            {gymName && <span className="range-chip">{gymName}</span>}
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
          const options = ex.options
            ?.map((id) => ({ id, name: exerciseName(id) }))
            .sort((a, b) => a.name.localeCompare(b.name));
          const menuLabel = ex.options?.some((id) => AB_OPTION_IDS.includes(id))
            ? 'Select ab exercise…'
            : 'Select leg exercise…';
          return (
            <ExerciseCard
              key={`${exIdx}`}
              ex={ex}
              name={exerciseName(ex.exerciseId)}
              targetReps={targetReps}
              suggestedWeight={suggestedWeight}
              mean={meanExercisePoint(hist, ex.exerciseId)}
              best={bestExercisePoint(hist, ex.exerciseId)}
              options={options}
              menuLabel={menuLabel}
              onSelect={(id) => changeExercise(exIdx, id)}
              onShowHistory={() => setHistoryFor(ex.exerciseId)}
              onChange={(setIdx, patch) => setSetValue(exIdx, setIdx, patch)}
              onAddSet={() => addSet(exIdx)}
              onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
            />
          );
        })}
      </div>

      <button className="btn primary block finish" onClick={handleFinish}>
        Finish workout
      </button>

      {historyFor && (
        <ExerciseHistoryModal
          exerciseId={historyFor}
          name={exerciseName(historyFor)}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}

function ExerciseHistoryModal({
  exerciseId,
  name,
  onClose,
}: {
  exerciseId: string;
  name: string;
  onClose: () => void;
}) {
  const { data } = useStore();
  const rows = sessionsForExercise(data.sessions, exerciseId, data.currentGymId)
    .map((s) => {
      const logged = s.exercises.find((e) => e.exerciseId === exerciseId);
      const sets = logged?.sets.filter((st) => st.done && st.weight > 0 && st.reps > 0) ?? [];
      if (!sets.length) return null;
      const volume = Math.round(sets.reduce((a, st) => a + st.weight * st.reps, 0));
      const best1RM = Math.round(
        Math.max(...sets.map((st) => estimated1RM(st.weight, st.reps))),
      );
      return { date: s.date, sets, volume, best1RM };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{name}</span>
          <button className="btn ghost small" onClick={onClose}>
            Close
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="muted small">No history yet for this exercise.</p>
        ) : (
          <div className="modal-list">
            {rows.map((r, i) => (
              <div key={i} className="modal-row">
                <div className="modal-row-head">
                  <span className="modal-date">
                    {new Date(r.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="modal-row-stats">
                    <span className="kv">
                      <SvBadge letter="S" />
                      {r.best1RM.toLocaleString()}
                    </span>
                    <span className="kv">
                      <SvBadge letter="V" />
                      {r.volume.toLocaleString()}
                    </span>
                  </span>
                </div>
                <div className="history-sets">
                  {r.sets.map((st, j) => (
                    <span key={j} className="history-set">
                      {st.weight}×{st.reps}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
  mean,
  best,
  options,
  menuLabel,
  onSelect,
  onShowHistory,
  onChange,
  onAddSet,
  onRemoveSet,
}: {
  ex: LoggedExercise;
  name: string;
  targetReps: number;
  suggestedWeight: number;
  mean: { volume: number; best1RM: number } | null;
  best: { volume: number; best1RM: number } | null;
  options?: { id: string; name: string }[];
  menuLabel?: string;
  onSelect: (id: string) => void;
  onShowHistory: () => void;
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

  const selected = !options || !!ex.exerciseId;

  return (
    <div className={selected ? 'exercise-card' : 'exercise-card collapsed'}>
      <div className="exercise-head">
        {options ? (
          <select
            className="ex-menu"
            value={ex.exerciseId}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">{menuLabel ?? 'Select exercise…'}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="exercise-name">{name}</span>
        )}
      </div>

      {selected && (
        <>
      <div
        className="ex-stats clickable"
        role="button"
        tabIndex={0}
        onClick={onShowHistory}
      >
        <div className="ex-stats-row head">
          <span />
          <span>Logged</span>
          <span>Planned</span>
          <span>Mean</span>
          <span>Best</span>
        </div>
        <div className="ex-stats-row">
          <span className="k"><SvBadge letter="S" /></span>
          <span className="a">{fmt(strLogged)}</span>
          <span>{fmt(strPlanned)}</span>
          <span>{fmt(mean?.best1RM)}</span>
          <span>{fmt(best?.best1RM)}</span>
        </div>
        <div className="ex-stats-row">
          <span className="k"><SvBadge letter="V" /></span>
          <span className="a">{fmt(volLogged)}</span>
          <span>{fmt(volPlanned)}</span>
          <span>{fmt(mean?.volume)}</span>
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
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => onChange(i, { weight: Number(e.target.value), autoWeight: false })}
          />
          <input
            type="number"
            inputMode="numeric"
            value={s.reps || ''}
            placeholder={String(phReps[i])}
            onFocus={(e) => e.currentTarget.select()}
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
        </>
      )}
    </div>
  );
}
