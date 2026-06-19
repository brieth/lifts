import type { Exercise, Routine, RoutineExercise } from './types';

/** [exercise name, superset group?] */
type Def = [string, string?];

interface RoutineDef {
  name: string;
  subtitle: string;
  exercises: Def[];
}

/**
 * The 200 lb Minimalist routine, exercises only.
 * Rules applied:
 *  - Barbell instead of Smith machine.
 *  - Machine Leg Press inserted in the middle of every A workout.
 *  - Machine Lying Hamstring Curl inserted in the middle of every B workout.
 */
const ROUTINE_DEFS: RoutineDef[] = [
  {
    name: 'Day 1A',
    subtitle: 'Bicep Peak / Shoulder Focus',
    exercises: [
      ['Barbell Incline Bench Press'],
      ['V-Bar Pulldown'],
      ['Machine Leg Press'],
      ['Behind the Back Cable Lateral Raise', '1'],
      ['Behind the Back Cable Bicep Curl', '1'],
    ],
  },
  {
    name: 'Day 1B',
    subtitle: 'Tricep Long Head Focus',
    exercises: [
      ['Cable Crossover Fly'],
      ['Cable Row'],
      ['Machine Lying Hamstring Curl'],
      ['Cable Rope Overhead Triceps Extension', '1'],
      ['Cable Face Pull', '1'],
    ],
  },
  {
    name: 'Day 2A',
    subtitle: 'Short Head / Zero Brachialis Overlap',
    exercises: [
      ['Barbell Bench Press'],
      ['Lat Pulldown'],
      ['Machine Leg Press'],
      ['Cable Upright Row (Straight Bar)', '1'],
      ['Cable Bicep Curl (Straight Bar)', '1'],
    ],
  },
  {
    name: 'Day 2B',
    subtitle: 'Brachialis / Tricep Horseshoe',
    exercises: [
      ['Mid Cable Crossover Fly', '1'],
      ['Cable Rear Delt Fly', '1'],
      ['Machine Lying Hamstring Curl'],
      ['Cable Rope Tricep Extension', '2'],
      ['Cable Rope Hammer Curls', '2'],
    ],
  },
  {
    name: 'Day 3A',
    subtitle: 'Lower Chest Mass / Free Weight Isolation',
    exercises: [
      ['Barbell Decline Press'],
      ['Reverse Grip Pull Down'],
      ['Machine Leg Press'],
      ['Dumbbell Lateral Raise', '1'],
      ['Dumbbell Skullcrusher', '1'],
    ],
  },
  {
    name: 'Day 3B',
    subtitle: 'The Peak Builder',
    exercises: [
      ['Low Cable Chest Fly', '1'],
      ['Shotgun Row', '1'],
      ['Machine Lying Hamstring Curl'],
      ['Chest-Supported Dumbbell Kickback', '2'],
      ['Incline Dumbbell Curl', '2'],
    ],
  },
];

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSeed(): { exercises: Exercise[]; routines: Routine[] } {
  const exerciseMap = new Map<string, Exercise>();
  const routines: Routine[] = [];

  for (const def of ROUTINE_DEFS) {
    const exercises: RoutineExercise[] = def.exercises.map(([name, superset]) => {
      const id = slug(name);
      if (!exerciseMap.has(id)) exerciseMap.set(id, { id, name });
      return { exerciseId: id, superset, targetSets: DEFAULT_SETS, targetReps: DEFAULT_REPS };
    });
    routines.push({
      id: slug(def.name),
      name: def.name,
      subtitle: def.subtitle,
      exercises,
    });
  }

  return { exercises: [...exerciseMap.values()], routines };
}

export const SEED = buildSeed();
