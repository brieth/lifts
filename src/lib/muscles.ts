import type { Session } from '../types';
import { isCurrentExercise } from '../seed';

/**
 * Muscle group each exercise is credited to (its PRIMARY mover only — we don't
 * split a set across muscles, which keeps the weekly "hard sets" count honest
 * rather than inflating it). Front, side and rear delts all roll up into the
 * single Delts bucket, so the front raise and rear-delt work land there too.
 */
export type MuscleGroup = 'Chest' | 'Back' | 'Delts' | 'Triceps' | 'Biceps' | 'Legs' | 'Abs';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Delts',
  'Triceps',
  'Biceps',
  'Legs',
  'Abs',
];

const MUSCLE: Record<string, MuscleGroup> = {
  // Chest
  'barbell-incline-bench-press': 'Chest',
  'barbell-bench-press': 'Chest',
  'barbell-decline-bench-press': 'Chest',
  'cable-high-crossover-fly': 'Chest',
  'cable-mid-crossover-fly': 'Chest',
  'cable-low-crossover-fly': 'Chest',
  // Back
  'close-grip-lat-pulldown': 'Back',
  'lat-pulldown': 'Back',
  'wide-grip-lat-pulldown': 'Back',
  'cable-single-arm-high-row': 'Back',
  'cable-single-arm-mid-row': 'Back',
  'cable-single-arm-low-row': 'Back',
  // Delts (front / side / rear tracked together as one group)
  'cable-behind-the-back-lateral-raise': 'Delts',
  'cable-upright-row': 'Delts',
  'cable-face-pull': 'Delts',
  // Triceps (forearm/brachioradialis rolls up into Biceps, matching the curls)
  'cable-high-overhead-tricep-extension': 'Triceps',
  'cable-low-overhead-tricep-extension': 'Triceps',
  'cable-tricep-pushdown': 'Triceps',
  'cable-underhand-tricep-pushdown': 'Triceps',
  // Biceps
  'cable-behind-the-back-bicep-curl': 'Biceps',
  'cable-bicep-curl': 'Biceps',
  'cable-overhead-bicep-curl': 'Biceps',
  'cable-hammer-curl': 'Biceps',
  'cable-reverse-curl': 'Biceps',
  // Abs (every cable-ab-menu option)
  'cable-crunch': 'Abs',
  'cable-high-woodchopper': 'Abs',
  'cable-low-woodchopper': 'Abs',
  'cable-oblique-crunch': 'Abs',
  // Legs (every leg-menu option)
  'machine-leg-press': 'Legs',
  'machine-lying-hamstring-curl': 'Legs',
  'machine-glute-bridge': 'Legs',
  'machine-hip-abductor': 'Legs',
  'machine-hip-adductor': 'Legs',
  'machine-leg-curl': 'Legs',
  'machine-leg-extension': 'Legs',
  // Retired exercises. These no longer count toward any tally (see credit()),
  // but the mappings stay so their names and grouping resolve in History.
  'v-bar-pulldown': 'Back',
  'cable-row': 'Back',
  'reverse-grip-pull-down': 'Back',
  'shotgun-row': 'Back',
  'cable-front-raise': 'Delts',
  'dumbbell-lateral-raise': 'Delts',
  'cable-rear-delt-fly': 'Delts',
  'dumbbell-skullcrusher': 'Triceps',
  'dumbbell-kickback': 'Triceps',
  'incline-dumbbell-curl': 'Biceps',
  'dumbbell-spider-curl': 'Biceps',
};

export function muscleFor(exerciseId: string): MuscleGroup | null {
  return MUSCLE[exerciseId] ?? null;
}

/**
 * Secondary movers, credited at HALF a set each. Presses drive the triceps and
 * front delts; pulls drive the biceps; rows additionally hit the rear delts.
 * (Front/rear delt both roll up into the single Delts group.)
 */
const SECONDARY: Record<string, MuscleGroup[]> = {
  'barbell-incline-bench-press': ['Triceps', 'Delts'],
  'barbell-bench-press': ['Triceps', 'Delts'],
  'barbell-decline-bench-press': ['Triceps', 'Delts'],
  // pulldowns drive the biceps; rows additionally hit the rear delts
  'close-grip-lat-pulldown': ['Biceps'],
  'lat-pulldown': ['Biceps'],
  'wide-grip-lat-pulldown': ['Biceps'],
  'cable-single-arm-high-row': ['Biceps', 'Delts'],
  'cable-single-arm-mid-row': ['Biceps', 'Delts'],
  'cable-single-arm-low-row': ['Biceps', 'Delts'],
  // retired exercises, kept for older logged sessions
  'v-bar-pulldown': ['Biceps'],
  'reverse-grip-pull-down': ['Biceps'],
  'cable-row': ['Biceps', 'Delts'],
  'shotgun-row': ['Biceps', 'Delts'],
};

export function secondaryFor(exerciseId: string): MuscleGroup[] {
  return SECONDARY[exerciseId] ?? [];
}

/** Sunday 00:00 of the calendar week (Sun–Sat) containing `d` (local time). */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay()); // getDay(): Sun = 0 … Sat = 6
  return x;
}

export interface MuscleTally {
  /** Completed (done) sets, full credit for primary + 0.5 per secondary. */
  logged: number;
  /** Active-session sets not yet done — the planned remainder for today. */
  planned: number;
}

type Tally = Record<MuscleGroup, MuscleTally>;

function blankTally(): Tally {
  return Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, { logged: 0, planned: 0 }])) as Tally;
}

function credit(out: Tally, exerciseId: string, key: keyof MuscleTally, sets: number): void {
  if (sets <= 0) return;
  // Exercises dropped from the routine don't count toward any tally, even in
  // the past weeks where they were actually performed.
  if (!isCurrentExercise(exerciseId)) return;
  const primary = muscleFor(exerciseId);
  if (!primary) return;
  out[primary][key] += sets;
  for (const m of secondaryFor(exerciseId)) out[m][key] += sets * 0.5;
}

/**
 * Hard sets per muscle for the calendar week starting `start`. Completed sets
 * (from finished sessions, plus done sets in the active session) count as
 * `logged`; the active session's not-yet-done sets count as `planned`, so the
 * bars can update live during a workout.
 */
export function weeklyMuscleTally(
  sessions: Session[],
  start: Date,
  active?: Session | null,
): Tally {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const inWeek = (iso: string) => {
    const d = new Date(iso);
    return d >= start && d < end;
  };

  const out = blankTally();

  for (const s of sessions) {
    if (!inWeek(s.date)) continue;
    for (const ex of s.exercises) {
      const done = ex.sets.filter((st) => st.done && st.weight > 0 && st.reps > 0).length;
      credit(out, ex.exerciseId, 'logged', done);
    }
  }

  // An in-progress session is happening now, so it always counts toward the
  // current week regardless of its start timestamp (it is only passed in for
  // the current week). Without this, a workout started just before the Sunday
  // boundary would be misattributed to last week and vanish from this week.
  if (active) {
    for (const ex of active.exercises) {
      const done = ex.sets.filter((st) => st.done && st.weight > 0 && st.reps > 0).length;
      const planned = ex.sets.filter((st) => !st.done).length;
      credit(out, ex.exerciseId, 'logged', done);
      credit(out, ex.exerciseId, 'planned', planned);
    }
  }

  return out;
}
