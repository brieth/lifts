import type { Session } from '../types';

/**
 * Equipment type per exercise. Cable and machine resistance varies between gyms
 * (50 on one stack != 50 on another), so their history is tracked per gym.
 * Barbell and dumbbell loads are consistent everywhere, so they stay global.
 */
type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine';

const EQUIPMENT: Record<string, Equipment> = {
  // free weights — consistent anywhere (gym-independent)
  'barbell-incline-bench-press': 'barbell',
  'barbell-bench-press': 'barbell',
  'barbell-decline-bench-press': 'barbell',
  'dumbbell-lateral-raise': 'dumbbell',
  'dumbbell-skullcrusher': 'dumbbell',
  'dumbbell-kickback': 'dumbbell',
  'incline-dumbbell-curl': 'dumbbell',
  'dumbbell-spider-curl': 'dumbbell',
  // machines — gym-dependent
  'machine-leg-press': 'machine',
  'machine-lying-hamstring-curl': 'machine',
  'machine-glute-bridge': 'machine',
  'machine-hip-abductor': 'machine',
  'machine-hip-adductor': 'machine',
  'machine-leg-curl': 'machine',
  'machine-leg-extension': 'machine',
  // cables — gym-dependent (current program)
  'close-grip-lat-pulldown': 'cable',
  'lat-pulldown': 'cable',
  'wide-grip-lat-pulldown': 'cable',
  'cable-high-crossover-fly': 'cable',
  'cable-mid-crossover-fly': 'cable',
  'cable-low-crossover-fly': 'cable',
  'cable-single-arm-high-row': 'cable',
  'cable-single-arm-mid-row': 'cable',
  'cable-single-arm-low-row': 'cable',
  'cable-behind-the-back-lateral-raise': 'cable',
  'cable-behind-the-back-bicep-curl': 'cable',
  'cable-upright-row': 'cable',
  'cable-bicep-curl': 'cable',
  'cable-high-overhead-tricep-extension': 'cable',
  'cable-low-overhead-tricep-extension': 'cable',
  'cable-tricep-pushdown': 'cable',
  'cable-underhand-tricep-pushdown': 'cable',
  'cable-hammer-curl': 'cable',
  'cable-reverse-curl': 'cable',
  'cable-overhead-bicep-curl': 'cable',
  'cable-face-pull': 'cable',
  // cables — retired exercises, kept so older logged history still classifies
  // as gym-dependent (their sessions predate the current program).
  'cable-front-raise': 'cable',
  'v-bar-pulldown': 'cable',
  'cable-row': 'cable',
  'cable-rear-delt-fly': 'cable',
  'reverse-grip-pull-down': 'cable',
  'shotgun-row': 'cable',
};

// Unknown/custom exercises default to gym-independent to avoid fragmenting history.
export function equipmentFor(exerciseId: string): Equipment {
  return EQUIPMENT[exerciseId] ?? 'barbell';
}

export function isGymDependent(exerciseId: string): boolean {
  const e = equipmentFor(exerciseId);
  return e === 'cable' || e === 'machine';
}

/**
 * The sessions that count toward an exercise's history/best/last/suggestion.
 * For gym-dependent exercises, restrict to the current gym; otherwise all.
 */
export function sessionsForExercise(
  sessions: Session[],
  exerciseId: string,
  currentGymId: string | null,
): Session[] {
  if (!isGymDependent(exerciseId) || !currentGymId) return sessions;
  return sessions.filter((s) => s.gymId === currentGymId);
}
