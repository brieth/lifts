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
    points.push({ date: session.date, topSet, best1RM: Math.round(best1RM), volume });
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

/** Mean logged volume and mean est. 1RM per session for an exercise, or null. */
export function meanExercisePoint(
  sessions: Session[],
  exerciseId: ID,
): { volume: number; best1RM: number } | null {
  const history = exerciseHistory(sessions, exerciseId);
  if (!history.length) return null;
  const n = history.length;
  return {
    volume: Math.round(history.reduce((a, p) => a + p.volume, 0) / n),
    best1RM: Math.round(history.reduce((a, p) => a + p.best1RM, 0) / n),
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
 * gym-relative, free weights global). Only exercises with logged history
 * contribute, and each counts from its first performance onward, so the line
 * steps up as new exercises enter the rotation.
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
      if (latest) {
        best1RM += latest.best1RM * factor;
        volume += latest.volume * factor;
        topSet += latest.topSet * factor;
      }
    }
    return { date, topSet, best1RM: Math.round(best1RM), volume: Math.round(volume) };
  });
}

export function sessionVolume(session: Session): number {
  let total = 0;
  for (const logged of session.exercises) {
    for (const s of logged.sets) {
      if (s.done) total += s.weight * s.reps;
    }
  }
  return total;
}
