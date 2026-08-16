/**
 * Exercises whose logged weight/reps represent ONE limb or side: each hand on
 * its own stack (crossover flys), or one arm/side worked at a time (single-arm
 * rows, behind-the-back moves, oblique work). Their real per-set work is double
 * what you enter.
 *
 * This factor is applied ONLY to aggregates (the Upper Body index and session
 * volume), so that a per-limb movement and a two-limb movement (bar curl,
 * pulldown, press) get equal say. Per-exercise charts and the weekly set counts
 * are deliberately NOT affected, since those stay in the single-side numbers you
 * actually log.
 */
const PER_LIMB = new Set<string>([
  // each hand on its own stack, both arms at once
  'cable-high-crossover-fly',
  'cable-mid-crossover-fly',
  'cable-low-crossover-fly',
  // one arm at a time
  'cable-single-arm-high-row',
  'cable-single-arm-mid-row',
  'cable-single-arm-low-row',
  'cable-behind-the-back-bicep-curl',
  'cable-behind-the-back-lateral-raise',
  // one side at a time (trunk)
  'cable-oblique-crunch',
  'cable-high-woodchopper',
  'cable-low-woodchopper',
  // retired per-limb exercises, kept so older history aggregates consistently
  'cable-rear-delt-fly',
  'shotgun-row',
]);

/** Multiplier for an exercise's contribution to the aggregate index (1 or 2). */
export function limbFactor(exerciseId: string): number {
  return PER_LIMB.has(exerciseId) ? 2 : 1;
}
