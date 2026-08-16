import type { Calibration, Session, Station } from '../types';

/**
 * Converting between what a machine's stack says and the force you actually
 * feel at the handle.
 *
 * A cable stack's number is not pounds of resistance. Pulley ratio scales it
 * (a 2:1 column halves it), and the carriage and cable that get lifted at every
 * setting add a constant. Both are properties of the machine, so two stations
 * can read wildly differently for identical effort.
 *
 * An exercise with no station is treated as already normalized, i.e. the number
 * you logged IS the force. That keeps every existing log valid and means you
 * only calibrate the stations you care about.
 */

export const LB_PER_KG = 2.2046226218;

/** force = slope * stack + offset, with stack in the station's own units. */
export interface Conversion {
  slope: number;
  offset: number;
}

const IDENTITY: Conversion = { slope: 1, offset: 0 };

/** Oldest first, so the last entry is the most recent calibration. */
function sortedCalibrations(station: Station): Calibration[] {
  return [...(station.calibrations ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

/** The most recent calibration on this station, or undefined if never measured. */
export function latestCalibration(station?: Station): Calibration | undefined {
  if (!station) return undefined;
  const all = sortedCalibrations(station);
  return all[all.length - 1];
}

/**
 * The calibration that was in effect at a given moment: the newest one measured
 * on or before that date.
 *
 * A session logged before the station was ever calibrated falls back to the
 * earliest calibration. Its raw stack numbers are certainly wrong, and the
 * closest evidence about the machine is the first time it was measured.
 *
 * Omitting `when` asks for the latest, which is what a workout in progress
 * wants: today's numbers should convert through today's machine.
 */
export function calibrationAt(station?: Station, when?: string): Calibration | undefined {
  if (!station) return undefined;
  const all = sortedCalibrations(station);
  if (all.length === 0) return undefined;
  if (!when) return all[all.length - 1];
  const day = when.slice(0, 10);
  // Undated records sort first, so they cover everything up to the next one.
  const inEffect = all.filter((c) => !c.date || c.date <= day);
  return inEffect.length ? inEffect[inEffect.length - 1] : all[0];
}

/**
 * Stack-to-force mapping for a station at a given moment.
 *
 * With no calibration, a kg-marked stack still converts by its unit: 50 on the
 * stack is 110 lb before any pulley ratio is accounted for, which is far closer
 * to the truth than treating 50 as 50. A calibration supersedes that entirely,
 * since its slope was fitted against the same printed numbers and therefore
 * already carries the unit conversion inside it.
 */
export function conversionFor(station?: Station, when?: string): Conversion {
  if (!station) return IDENTITY;
  const cal = calibrationAt(station, when);
  if (cal) return { slope: cal.slope, offset: cal.offset };
  return { slope: station.unit === 'kg' ? LB_PER_KG : 1, offset: 0 };
}

/** force = slope * stack + offset */
export function toForce(stackWeight: number, conv: Conversion = IDENTITY): number {
  return conv.slope * stackWeight + conv.offset;
}

/** The stack setting needed to produce a given force. */
export function fromForce(force: number, conv: Conversion = IDENTITY): number {
  if (conv.slope === 0) return force;
  return (force - conv.offset) / conv.slope;
}

export function findStation(stations: Station[], id?: string): Station | undefined {
  return id ? stations.find((s) => s.id === id) : undefined;
}

/**
 * Least-squares fit of force = slope * stack + offset over the measured pairs.
 * Two samples give an exact line; three or more also reveal whether the machine
 * is actually linear, which is why the UI asks for three.
 */
export function fitCalibration(
  samples: { stack: number; force: number }[],
): { slope: number; offset: number } | null {
  const pts = samples.filter((s) => s.stack > 0 && s.force > 0);
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.stack, 0) / n;
  const my = pts.reduce((a, p) => a + p.force, 0) / n;
  const den = pts.reduce((a, p) => a + (p.stack - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = pts.reduce((a, p) => a + (p.stack - mx) * (p.force - my), 0) / den;
  return { slope, offset: my - slope * mx };
}

/**
 * How far the samples sit off the fitted line, as a percentage of the largest
 * measured force. Small means the machine is linear and the fit can be trusted
 * beyond the range you measured.
 */
export function fitError(
  samples: { stack: number; force: number }[],
  fit: { slope: number; offset: number },
): number {
  const pts = samples.filter((s) => s.stack > 0 && s.force > 0);
  if (!pts.length) return 0;
  const worst = Math.max(...pts.map((p) => Math.abs(p.force - (fit.slope * p.stack + fit.offset))));
  const scale = Math.max(...pts.map((p) => p.force));
  return scale ? (worst / scale) * 100 : 0;
}

/**
 * A copy of the sessions with every logged weight converted to real force,
 * each through the calibration that was in effect on its own date. All
 * analytics run on this, so numbers from different stations and different
 * points in a machine's life are directly comparable. Display and editing use
 * the raw sessions.
 */
export function normalizeSessions(sessions: Session[], stations: Station[]): Session[] {
  if (stations.length === 0) return sessions;
  return sessions.map((s) => ({
    ...s,
    exercises: s.exercises.map((e) => {
      const station = findStation(stations, e.stationId);
      if (!station) return e;
      const conv = conversionFor(station, s.date);
      return {
        ...e,
        sets: e.sets.map((st) => ({ ...st, weight: toForce(st.weight, conv) })),
      };
    }),
  }));
}
