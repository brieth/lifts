/**
 * Exercises where a single logged set only captures ONE side's load, so volume
 * is counted ×2 to reflect total work — keeping the volume metric consistent
 * across every exercise. Two kinds:
 *   - unilateral (one arm/side at a time)
 *   - a dumbbell in each hand (two implements moving at once)
 * Strength (est. 1RM) is NOT doubled — it stays the per-hand number you lifted.
 */
const DOUBLED = new Set<string>([
  // unilateral — one side at a time
  'behind-the-back-cable-lateral-raise',
  'behind-the-back-cable-bicep-curl',
  'shotgun-row',
  // a dumbbell in each hand
  'dumbbell-lateral-raise',
  'dumbbell-skullcrusher',
  'dumbbell-kickback',
  'incline-dumbbell-curl',
  'dumbbell-spider-curl',
]);

export function volumeMultiplier(exerciseId: string): number {
  return DOUBLED.has(exerciseId) ? 2 : 1;
}

export function isDoubledVolume(exerciseId: string): boolean {
  return DOUBLED.has(exerciseId);
}
