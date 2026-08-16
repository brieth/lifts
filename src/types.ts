export type ID = string;

export interface Exercise {
  id: ID;
  name: string;
}

export interface RoutineExercise {
  exerciseId: ID;
  /** Superset group label (e.g. "1", "2"). Undefined = straight sets. */
  superset?: string;
  /** If set, this slot is a menu: the user can swap among these exercise ids. */
  options?: ID[];
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
  /** If set, this slot is a menu: ids the user can swap to during the session. */
  options?: ID[];
  /** Which machine this was performed on. Undefined = the unspecified station. */
  stationId?: ID;
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

/**
 * A specific machine, identified however you like ("Planet Fitness, cable by
 * the water fountain"). Cable stacks and machines differ in pulley ratio and
 * carriage weight, so the number on the stack is not the force at the handle.
 *
 * Calibrating a station means measuring that relationship:
 *   force = slope * stackWeight + offset
 *
 * Logged weights stay exactly as you set them on the machine. The calibration
 * converts them to real force for every metric, so history stays comparable no
 * matter which station you used.
 */
export interface Station {
  id: ID;
  name: string;
  slope: number;
  /** Pounds, from the carriage and cable that get lifted at any setting. */
  offset: number;
  /** The (stack, measured force) pairs the calibration was fitted from. */
  samples?: { stack: number; force: number }[];
}

/** Rep emphasis for the session; maps to a per-exercise rep target. */
export type Emphasis = 'low' | 'medium' | 'high';

export interface AppData {
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  activeSession: Session | null;
  stations: Station[];
}
