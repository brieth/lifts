import type { Session, Station } from '../types';

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

/** force = slope * stack + offset */
export function toForce(stackWeight: number, station?: Station): number {
  if (!station) return stackWeight;
  return station.slope * stackWeight + station.offset;
}

/** The stack setting needed to produce a given force on this station. */
export function fromForce(force: number, station?: Station): number {
  if (!station || station.slope === 0) return force;
  return (force - station.offset) / station.slope;
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
 * A copy of the sessions with every logged weight converted to real force.
 * All analytics run on this, so numbers from different stations are directly
 * comparable. Display and editing use the raw sessions.
 */
export function normalizeSessions(sessions: Session[], stations: Station[]): Session[] {
  if (stations.length === 0) return sessions;
  return sessions.map((s) => ({
    ...s,
    exercises: s.exercises.map((e) => {
      const station = findStation(stations, e.stationId);
      if (!station) return e;
      return {
        ...e,
        sets: e.sets.map((st) => ({ ...st, weight: toForce(st.weight, station) })),
      };
    }),
  }));
}
