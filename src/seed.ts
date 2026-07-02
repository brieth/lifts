import type { Exercise, Routine, RoutineExercise } from './types';

/**
 * [stable id, display name].
 *
 * The id is PERMANENT — all logged history, PRs, and weight suggestions key off
 * it, so it must never change. The name is just a label: edit it freely (here or
 * later) and the rename propagates without breaking history, because load()
 * prefers the seed's name for any known id.
 */
type ExRef = [id: string, name: string];

interface RoutineDef {
  id: string;
  name: string;
  exercises: ExRef[];
}

/**
 * The 200 lb Minimalist routine, exercises only.
 *  - Barbell instead of Smith machine.
 *  - Machine Leg Press in the middle of every A workout.
 *  - Machine Lying Hamstring Curl in the middle of every B workout.
 */
const ROUTINE_DEFS: RoutineDef[] = [
  {
    id: '1a',
    name: '1A',
    exercises: [
      ['barbell-incline-bench-press', 'Barbell Incline Bench Press'],
      ['close-grip-lat-pulldown', 'Close Grip Lat Pulldown'],
      ['machine-leg-press', 'Machine Leg Press'],
      ['behind-the-back-cable-bicep-curl', 'Behind the Back Cable Bicep Curl'],
      ['behind-the-back-cable-lateral-raise', 'Behind the Back Cable Lateral Raise'],
    ],
  },
  {
    id: '1b',
    name: '1B',
    exercises: [
      ['high-cable-crossover-fly', 'High Cable Crossover Fly'],
      ['high-cable-row', 'High Cable Row'],
      ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
      ['cable-rope-overhead-tricep-extension', 'Cable Rope Overhead Tricep Extension'],
      ['cable-face-pull', 'Cable Face Pull'],
    ],
  },
  {
    id: '2a',
    name: '2A',
    exercises: [
      ['barbell-bench-press', 'Barbell Bench Press'],
      ['lat-pulldown', 'Lat Pulldown'],
      ['machine-leg-press', 'Machine Leg Press'],
      ['cable-bicep-curl', 'Cable Bicep Curl'],
      ['cable-upright-row', 'Cable Upright Row'],
    ],
  },
  {
    id: '2b',
    name: '2B',
    exercises: [
      ['mid-cable-crossover-fly', 'Mid Cable Crossover Fly'],
      ['mid-cable-row', 'Mid Cable Row'],
      ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
      ['cable-rope-tricep-pushdown', 'Cable Rope Tricep Pushdown'],
      ['cable-rope-hammer-curl', 'Cable Rope Hammer Curl'],
    ],
  },
  {
    id: '3a',
    name: '3A',
    exercises: [
      ['barbell-decline-bench-press', 'Barbell Decline Bench Press'],
      ['wide-grip-lat-pulldown', 'Wide Grip Lat Pulldown'],
      ['machine-leg-press', 'Machine Leg Press'],
      ['underhand-cable-pushdown', 'Underhand Cable Pushdown'],
      ['overhead-cable-curl', 'Overhead Cable Curl'],
    ],
  },
  {
    id: '3b',
    name: '3B',
    exercises: [
      ['low-cable-crossover-fly', 'Low Cable Crossover Fly'],
      ['low-cable-row', 'Low Cable Row'],
      ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
      ['cable-reverse-curl', 'Cable Reverse Curl'],
      ['cable-front-raise', 'Cable Front Raise'],
    ],
  },
];

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;

/**
 * The center "leg slot" is a menu the user picks from each workout. Listed
 * alphabetically by name. The routine's own leg exercise stays the default.
 */
const LEG_OPTIONS: ExRef[] = [
  ['machine-glute-bridge', 'Machine Glute Bridge'],
  ['machine-hip-abductor', 'Machine Hip Abductor'],
  ['machine-hip-adductor', 'Machine Hip Adductor'],
  ['machine-leg-curl', 'Machine Leg Curl'],
  ['machine-leg-extension', 'Machine Leg Extension'],
  ['machine-leg-press', 'Machine Leg Press'],
  ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
];
export const LEG_OPTION_IDS = LEG_OPTIONS.map(([id]) => id);

function buildSeed(): { exercises: Exercise[]; routines: Routine[] } {
  const exerciseMap = new Map<string, Exercise>();
  const routines: Routine[] = [];

  // Register every leg-menu option so each has a name and its own history.
  for (const [id, name] of LEG_OPTIONS) {
    if (!exerciseMap.has(id)) exerciseMap.set(id, { id, name });
  }

  for (const def of ROUTINE_DEFS) {
    const exercises: RoutineExercise[] = def.exercises.map(([id, name]) => {
      if (!exerciseMap.has(id)) exerciseMap.set(id, { id, name });
      const re: RoutineExercise = {
        exerciseId: id,
        targetSets: DEFAULT_SETS,
        targetReps: DEFAULT_REPS,
      };
      // The leg slot (its default is one of the leg options) becomes a menu.
      if (LEG_OPTION_IDS.includes(id)) re.options = LEG_OPTION_IDS;
      return re;
    });
    routines.push({ id: def.id, name: def.name, exercises });
  }

  return { exercises: [...exerciseMap.values()], routines };
}

export const SEED = buildSeed();
