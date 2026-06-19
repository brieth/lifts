export type ID = string;

export interface Exercise {
  id: ID;
  name: string;
}

export interface RoutineExercise {
  exerciseId: ID;
  /** Superset group label (e.g. "1", "2"). Undefined = straight sets. */
  superset?: string;
  targetSets: number;
  targetReps: number;
}

export interface Routine {
  id: ID;
  name: string;        // e.g. "Day 1A"
  subtitle?: string;   // e.g. "Bicep Peak / Shoulder Focus"
  exercises: RoutineExercise[];
}

export interface SetEntry {
  weight: number;
  reps: number;
  done: boolean;
  autoWeight?: boolean; // weight was filled from the placeholder on Done
  autoReps?: boolean;   // reps were filled from the placeholder on Done
}

export interface LoggedExercise {
  exerciseId: ID;
  superset?: string;
  sets: SetEntry[];
}

export interface Session {
  id: ID;
  routineId?: ID;
  name: string;
  date: string;        // ISO timestamp
  emphasis?: Emphasis; // rep emphasis chosen for this session
  exercises: LoggedExercise[];
}

/** Rep emphasis for the session; maps to a per-exercise rep target. */
export type Emphasis = 'low' | 'medium' | 'high';

export interface AppData {
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  activeSession: Session | null;
}
