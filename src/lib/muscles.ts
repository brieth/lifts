import type { Session } from '../types';

/**
 * Muscle group each exercise is credited to (its PRIMARY mover only — we don't
 * split a set across muscles, which keeps the weekly "hard sets" count honest
 * rather than inflating it). Front delt has no direct work in this program (it
 * rides on the presses), so there's intentionally no Front Delt bucket.
 */
export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Side Delt'
  | 'Rear Delt'
  | 'Triceps'
  | 'Biceps'
  | 'Legs';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Side Delt',
  'Rear Delt',
  'Triceps',
  'Biceps',
  'Legs',
];

const MUSCLE: Record<string, MuscleGroup> = {
  // Chest
  'barbell-incline-bench-press': 'Chest',
  'barbell-bench-press': 'Chest',
  'barbell-decline-bench-press': 'Chest',
  'cable-crossover-fly': 'Chest',
  'mid-cable-crossover-fly': 'Chest',
  'low-cable-chest-fly': 'Chest',
  // Back
  'v-bar-pulldown': 'Back',
  'cable-row': 'Back',
  'lat-pulldown': 'Back',
  'reverse-grip-pull-down': 'Back',
  'shotgun-row': 'Back',
  // Side delt
  'behind-the-back-cable-lateral-raise': 'Side Delt',
  'cable-upright-row': 'Side Delt',
  'dumbbell-lateral-raise': 'Side Delt',
  // Rear delt
  'cable-face-pull': 'Rear Delt',
  'cable-rear-delt-fly': 'Rear Delt',
  // Triceps
  'cable-rope-overhead-tricep-extension': 'Triceps',
  'cable-rope-tricep-extension': 'Triceps',
  'dumbbell-skullcrusher': 'Triceps',
  'dumbbell-kickback': 'Triceps',
  // Biceps
  'behind-the-back-cable-bicep-curl': 'Biceps',
  'cable-bicep-curl': 'Biceps',
  'cable-rope-hammer-curl': 'Biceps',
  'incline-dumbbell-curl': 'Biceps',
  // Legs (every leg-menu option)
  'machine-leg-press': 'Legs',
  'machine-lying-hamstring-curl': 'Legs',
  'machine-glute-bridge': 'Legs',
  'machine-hip-abductor': 'Legs',
  'machine-hip-adductor': 'Legs',
  'machine-leg-curl': 'Legs',
  'machine-leg-extension': 'Legs',
};

export function muscleFor(exerciseId: string): MuscleGroup | null {
  return MUSCLE[exerciseId] ?? null;
}

/** Monday 00:00 of the calendar week containing `d` (local time). */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  x.setDate(x.getDate() - dow);
  return x;
}

/** Hard (completed) sets per muscle group for the calendar week starting `start`. */
export function weeklyMuscleSets(sessions: Session[], start: Date): Record<MuscleGroup, number> {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const out = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>;

  for (const s of sessions) {
    const d = new Date(s.date);
    if (d < start || d >= end) continue;
    for (const ex of s.exercises) {
      const m = muscleFor(ex.exerciseId);
      if (!m) continue;
      for (const set of ex.sets) {
        if (set.done && set.weight > 0 && set.reps > 0) out[m] += 1;
      }
    }
  }
  return out;
}
