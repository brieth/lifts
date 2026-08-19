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

/** What's printed on a stack. Force is always stored and shown in pounds. */
export type WeightUnit = 'lb' | 'kg';

/**
 * One measurement session on a station:
 *   force (lb) = slope * stackWeight (station's unit) + offset (lb)
 *
 * Dated because a machine is not a constant. Pulleys pick up friction as they
 * age and lose it again when someone services them, so a fit measured in June
 * describes June. Recalibrating adds a record rather than replacing one, and
 * each logged session converts through whichever calibration was in effect
 * when it happened.
 */
export interface Calibration {
  id: ID;
  /** YYYY-MM-DD the measurements were taken. Empty means undated. */
  date: string;
  slope: number;
  offset: number;
  /**
   * True when the slope was rounded to a clean pulley ratio the samples
   * couldn't rule out, rather than taken straight off the fit. The samples are
   * still what was measured, so the raw record survives the rounding.
   */
  snapped?: boolean;
  /** The (stack, measured force) pairs this was fitted from. */
  samples?: { stack: number; force: number }[];
}

/**
 * A specific machine, identified however you like ("Planet Fitness, cable by
 * the water fountain"). Cable stacks and machines differ in pulley ratio and
 * carriage weight, so the number on the stack is not the force at the handle.
 *
 * Logged weights stay exactly as you set them on the machine. The calibrations
 * convert them to real force for every metric, so history stays comparable no
 * matter which station you used.
 */
export interface Station {
  id: ID;
  name: string;
  /** The units this stack is marked in. Governs the label you type against. */
  unit: WeightUnit;
  /** Newest last. Empty means uncalibrated, so only the unit conversion applies. */
  calibrations: Calibration[];
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
