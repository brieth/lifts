import type { Session, ID } from '../types';
import { sessionsForExercise } from './equipment';
import { limbFactor } from './laterality';

/** Epley estimated 1-rep max. */
export function estimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface ExercisePoint {
  date: string;
  topSet: number;     // heaviest weight lifted that day
  best1RM: number;    // best estimated 1RM that day
  volume: number;     // total weight x reps for the exercise that day
}

/** Per-session history for one exercise, oldest first. */
export function exerciseHistory(sessions: Session[], exerciseId: ID): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  const ordered = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

  for (const session of ordered) {
    const logged = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!logged) continue;
    const doneSets = logged.sets.filter((s) => s.done && s.weight > 0 && s.reps > 0);
    if (doneSets.length === 0) continue;

    let topSet = 0;
    let best1RM = 0;
    let volume = 0;
    for (const s of doneSets) {
      topSet = Math.max(topSet, s.weight);
      best1RM = Math.max(best1RM, estimated1RM(s.weight, s.reps));
      volume += s.weight * s.reps;
    }
    points.push({ date: session.date, topSet, best1RM: Math.round(best1RM), volume: Math.round(volume) });
  }
  return points;
}

export interface PR {
  exerciseId: ID;
  weight: number;
  reps: number;
  est1RM: number;
  date: string;
}

/** Best estimated-1RM set for each exercise across all sessions. */
export function personalRecords(sessions: Session[]): Map<ID, PR> {
  const prs = new Map<ID, PR>();
  for (const session of sessions) {
    for (const logged of session.exercises) {
      for (const s of logged.sets) {
        if (!s.done || s.weight <= 0 || s.reps <= 0) continue;
        const est = estimated1RM(s.weight, s.reps);
        const cur = prs.get(logged.exerciseId);
        if (!cur || est > cur.est1RM) {
          prs.set(logged.exerciseId, {
            exerciseId: logged.exerciseId,
            weight: s.weight,
            reps: s.reps,
            est1RM: Math.round(est),
            date: session.date,
          });
        }
      }
    }
  }
  return prs;
}

/** Most recent session's best estimated 1RM for an exercise, or null. */
export function recentEstimated1RM(sessions: Session[], exerciseId: ID): number | null {
  const history = exerciseHistory(sessions, exerciseId);
  return history.length ? history[history.length - 1].best1RM : null;
}

/** Inverse Epley: the weight you'd expect to hit for a given rep count at a 1RM. */
export function weightForReps(oneRepMax: number, reps: number): number {
  if (reps <= 1) return oneRepMax;
  return oneRepMax / (1 + reps / 30);
}

/** Most recent prior session's logged volume and est. 1RM for an exercise, or null. */
export function lastExercisePoint(
  sessions: Session[],
  exerciseId: ID,
): { volume: number; best1RM: number } | null {
  const history = exerciseHistory(sessions, exerciseId);
  if (!history.length) return null;
  const p = history[history.length - 1];
  return { volume: p.volume, best1RM: p.best1RM };
}

/** Linear-interpolated quantile (q in [0,1]) of a numeric sample. 0 if empty. */
function quantile(sample: number[], q: number): number {
  if (sample.length === 0) return 0;
  const s = [...sample].sort((a, b) => a - b);
  const rank = q * (s.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return s[lo];
  return s[lo] + (rank - lo) * (s[hi] - s[lo]);
}

/** Trailing window (sessions) for the rolling-Q3 reference line. */
export const Q3_WINDOW = 12;

/**
 * Rolling third-quartile (75th percentile): each point is the Q3 of the trailing
 * `window` values up to and including it. A competitive, outlier-resistant
 * reference that keeps pace as you improve (unlike a cumulative mean).
 */
export function rollingQ3(values: number[], window = Q3_WINDOW): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    return Math.round(quantile(values.slice(start, i + 1), 0.75));
  });
}

/** Rolling-Q3 (last Q3_WINDOW sessions) volume and est. 1RM for an exercise. */
export function q3ExercisePoint(
  sessions: Session[],
  exerciseId: ID,
): { volume: number; best1RM: number } | null {
  const history = exerciseHistory(sessions, exerciseId);
  if (!history.length) return null;
  const w = history.slice(-Q3_WINDOW);
  return {
    volume: Math.round(quantile(w.map((p) => p.volume), 0.75)),
    best1RM: Math.round(quantile(w.map((p) => p.best1RM), 0.75)),
  };
}

/** Best logged volume and best estimated 1RM for an exercise across all history. */
export function bestExercisePoint(
  sessions: Session[],
  exerciseId: ID,
): { volume: number; best1RM: number } | null {
  const history = exerciseHistory(sessions, exerciseId);
  if (!history.length) return null;
  return {
    volume: Math.max(...history.map((p) => p.volume)),
    best1RM: Math.max(...history.map((p) => p.best1RM)),
  };
}

/** Best estimated 1RM across a set list (rounded). 0 if none qualify. */
export function bestEstimated1RM(
  sets: { weight: number; reps: number; done?: boolean }[],
  onlyDone: boolean,
): number {
  let best = 0;
  for (const s of sets) {
    if (onlyDone && !s.done) continue;
    if (s.weight <= 0 || s.reps <= 0) continue;
    best = Math.max(best, estimated1RM(s.weight, s.reps));
  }
  return Math.round(best);
}

/**
 * Whole-body index. At each workout date, sum across `exerciseIds` of each
 * exercise's most-recent best-1RM and most-recent session volume as of that
 * date. Each exercise is looked up in its own gym scope (cables/machines are
 * gym-relative, free weights global).
 *
 * An exercise's value is back-filled to dates BEFORE its first performance,
 * using that first value. This keeps the basket constant over time, so adding
 * an exercise shifts the whole line up by a constant rather than creating a
 * step. The only thing that moves the line is a real change in some exercise's
 * most-recent number, i.e. actual progress.
 */
export function overallSeries(
  sessions: Session[],
  exerciseIds: ID[],
  currentGymId: string | null,
): ExercisePoint[] {
  const perEx = exerciseIds
    .map((id) => ({
      factor: limbFactor(id), // per-limb movements count double in the aggregate
      history: exerciseHistory(sessionsForExercise(sessions, id, currentGymId), id),
    }))
    .filter((e) => e.history.length > 0);

  const dates = [...new Set(perEx.flatMap((e) => e.history.map((p) => p.date)))].sort((a, b) =>
    a.localeCompare(b),
  );

  return dates.map((date) => {
    let best1RM = 0;
    let volume = 0;
    let topSet = 0;
    for (const { factor, history } of perEx) {
      // latest performance at or before this date (history is oldest-first)
      let latest: ExercisePoint | null = null;
      for (const p of history) {
        if (p.date <= date) latest = p;
        else break;
      }
      // Before this exercise's first performance, back-fill its first value.
      const point = latest ?? history[0];
      best1RM += point.best1RM * factor;
      volume += point.volume * factor;
      topSet += point.topSet * factor;
    }
    return { date, topSet, best1RM: Math.round(best1RM), volume: Math.round(volume) };
  });
}

/**
 * Total work for a session. Per-limb exercises (single-arm rows, crossover flys,
 * etc.) log one limb's load, so they're doubled here to reflect the real work
 * both limbs did. This is an aggregate, so it follows the same true-work rule as
 * the Overall index; per-set entry and per-exercise charts stay in raw numbers.
 */
export function sessionVolume(session: Session): number {
  let total = 0;
  for (const logged of session.exercises) {
    const factor = limbFactor(logged.exerciseId);
    for (const s of logged.sets) {
      if (s.done) total += s.weight * s.reps * factor;
    }
  }
  return total;
}
