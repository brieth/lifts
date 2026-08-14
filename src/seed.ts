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
      ['cable-behind-the-back-bicep-curl', 'Cable Behind the Back Bicep Curl'],
      ['cable-behind-the-back-lateral-raise', 'Cable Behind the Back Lateral Raise'],
    ],
  },
  {
    id: '1b',
    name: '1B',
    exercises: [
      ['cable-high-crossover-fly', 'Cable High Crossover Fly'],
      ['cable-single-arm-high-row', 'Cable Single Arm High Row'],
      ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
      ['cable-high-overhead-tricep-extension', 'Cable High Overhead Tricep Extension'],
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
      ['cable-mid-crossover-fly', 'Cable Mid Crossover Fly'],
      ['cable-single-arm-mid-row', 'Cable Single Arm Mid Row'],
      ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
      ['cable-tricep-pushdown', 'Cable Tricep Pushdown'],
      ['cable-hammer-curl', 'Cable Hammer Curl'],
    ],
  },
  {
    id: '3a',
    name: '3A',
    exercises: [
      ['barbell-decline-bench-press', 'Barbell Decline Bench Press'],
      ['wide-grip-lat-pulldown', 'Wide Grip Lat Pulldown'],
      ['machine-leg-press', 'Machine Leg Press'],
      ['cable-underhand-tricep-pushdown', 'Cable Underhand Tricep Pushdown'],
      ['cable-overhead-bicep-curl', 'Cable Overhead Bicep Curl'],
    ],
  },
  {
    id: '3b',
    name: '3B',
    exercises: [
      ['cable-low-crossover-fly', 'Cable Low Crossover Fly'],
      ['cable-single-arm-low-row', 'Cable Single Arm Low Row'],
      ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
      ['cable-low-overhead-tricep-extension', 'Cable Low Overhead Tricep Extension'],
      ['cable-reverse-curl', 'Cable Reverse Curl'],
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
  ['machine-hip-abductor', 'Machine Hip Abductor'],
  ['machine-hip-adductor', 'Machine Hip Adductor'],
  ['machine-leg-curl', 'Machine Leg Curl'],
  ['machine-leg-extension', 'Machine Leg Extension'],
  ['machine-leg-press', 'Machine Leg Press'],
  ['machine-lying-hamstring-curl', 'Machine Lying Hamstring Curl'],
];
export const LEG_OPTION_IDS = LEG_OPTIONS.map(([id]) => id);

/**
 * The trailing "ab slot" is a cable-ab menu appended to the END of every
 * workout (the leg slot sits in the middle). Listed alphabetically by name.
 * Pick one (or several) each session, or none.
 */
const AB_OPTIONS: ExRef[] = [
  ['cable-crunch', 'Cable Crunch'],
  ['cable-high-woodchopper', 'Cable High Woodchopper'],
  ['cable-low-woodchopper', 'Cable Low Woodchopper'],
  ['cable-oblique-crunch', 'Cable Oblique Crunch'],
];
export const AB_OPTION_IDS = AB_OPTIONS.map(([id]) => id);

function buildSeed(): { exercises: Exercise[]; routines: Routine[] } {
  const exerciseMap = new Map<string, Exercise>();
  const routines: Routine[] = [];

  // Register every leg- and ab-menu option so each has a name and its own history.
  for (const [id, name] of [...LEG_OPTIONS, ...AB_OPTIONS]) {
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
    // Append the cable-ab menu to the end of every workout (starts unpicked).
    exercises.push({
      exerciseId: AB_OPTION_IDS[0],
      targetSets: DEFAULT_SETS,
      targetReps: DEFAULT_REPS,
      options: AB_OPTION_IDS,
    });
    routines.push({ id: def.id, name: def.name, exercises });
  }

  return { exercises: [...exerciseMap.values()], routines };
}

export const SEED = buildSeed();

/**
 * Every exercise id reachable in the current program, including every leg- and
 * ab-menu option.
 *
 * Exercises from earlier versions of the routine still sit in logged history,
 * and they are deliberately excluded from every derived metric so the numbers
 * describe the program as it stands. History still shows what was actually
 * performed; it just doesn't feed the totals.
 */
export const CURRENT_EXERCISE_IDS: ReadonlySet<string> = new Set(
  SEED.routines
    .flatMap((r) => r.exercises.flatMap((e) => [e.exerciseId, ...(e.options ?? [])]))
    .filter(Boolean),
);

export function isCurrentExercise(id: string): boolean {
  return CURRENT_EXERCISE_IDS.has(id);
}
