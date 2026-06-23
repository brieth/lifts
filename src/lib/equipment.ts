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
  'barbell-decline-press': 'barbell',
  'dumbbell-lateral-raise': 'dumbbell',
  'dumbbell-skullcrusher': 'dumbbell',
  'dumbbell-kickback': 'dumbbell',
  'incline-dumbbell-curl': 'dumbbell',
  // machines — gym-dependent
  'machine-leg-press': 'machine',
  'machine-lying-hamstring-curl': 'machine',
  'machine-glute-bridge': 'machine',
  'machine-hip-abductor': 'machine',
  'machine-hip-adductor': 'machine',
  'machine-leg-curl': 'machine',
  'machine-leg-extension': 'machine',
  // cables — gym-dependent
  'v-bar-pulldown': 'cable',
  'behind-the-back-cable-lateral-raise': 'cable',
  'behind-the-back-cable-bicep-curl': 'cable',
  'cable-crossover-fly': 'cable',
  'cable-row': 'cable',
  'cable-rope-overhead-tricep-extension': 'cable',
  'cable-face-pull': 'cable',
  'lat-pulldown': 'cable',
  'cable-upright-row': 'cable',
  'cable-bicep-curl': 'cable',
  'mid-cable-crossover-fly': 'cable',
  'cable-rear-delt-fly': 'cable',
  'cable-rope-tricep-extension': 'cable',
  'cable-rope-hammer-curl': 'cable',
  'reverse-grip-pull-down': 'cable',
  'low-cable-chest-fly': 'cable',
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
