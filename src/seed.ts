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
      ['v-bar-pulldown', 'V-Bar Pulldown'],
      ['machine-leg-press', 'Machine Leg Press'],
      ['behind-the-back-cable-lateral-raise', 'Behind the Back Cable Lateral Raise'],
      ['behind-the-back-cable-bicep-curl', 'Behind the Back Cable Bicep Curl'],
    ],
  },
  {
    id: '1b',
    name: '1B',
    exercises: [
      ['cable-crossover-fly', 'Cable Crossover Fly'],
      ['cable-row', 'Cable Row'],
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
      ['cable-upright-row', 'Cable Upright Row'],
      ['cable-bicep-curl', 'Cable Bicep Curl'],
    ],
  },
  {
    id: '2b',
    name: '2B',
    exercises: [
      ['mid-cable-crossover-fly', 'Mid Cable Crossover Fly'],
      ['cable-rear-delt-fly', 'Cable Rear Delt Fly'],
      ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
      ['cable-rope-tricep-extension', 'Cable Rope Tricep Extension'],
      ['cable-rope-hammer-curl', 'Cable Rope Hammer Curl'],
    ],
  },
  {
    id: '3a',
    name: '3A',
    exercises: [
      ['barbell-decline-press', 'Barbell Decline Press'],
      ['reverse-grip-pull-down', 'Reverse Grip Pull Down'],
      ['machine-leg-press', 'Machine Leg Press'],
      ['dumbbell-lateral-raise', 'Dumbbell Lateral Raise'],
      ['dumbbell-skullcrusher', 'Dumbbell Skullcrusher'],
    ],
  },
  {
    id: '3b',
    name: '3B',
    exercises: [
      ['low-cable-chest-fly', 'Low Cable Chest Fly'],
      ['shotgun-row', 'Shotgun Row'],
      ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
      ['chest-supported-dumbbell-kickback', 'Chest-Supported Dumbbell Kickback'],
      ['incline-dumbbell-curl', 'Incline Dumbbell Curl'],
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
  ['machine-leg-curl', 'Machine Leg Curl'],
  ['machine-leg-extension', 'Machine Leg Extension'],
  ['machine-leg-press', 'Machine Leg Press'],
  ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
];
const LEG_OPTION_IDS = LEG_OPTIONS.map(([id]) => id);

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
