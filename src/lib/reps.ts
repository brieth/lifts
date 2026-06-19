import type { Emphasis, RepRange } from '../types';

/**
 * Per-exercise hypertrophy rep ranges.
 *
 * Expert consensus (Schoenfeld, Israetel/RP, Helms): growth happens across a
 * broad range near failure, but the practical sweet spot depends on the lift:
 *  - heavy compounds load well and fatigue a lot -> lower reps
 *  - vertical/horizontal pulls -> moderate reps
 *  - isolations / cables -> higher reps (metabolic stress, safer loaded light)
 *
 * The session-wide Low/Medium/High pick shifts every exercise within its own
 * appropriate band rather than forcing one number on the whole workout.
 */
type Category = 'compound' | 'pull' | 'isolation';

const RANGES: Record<Category, Record<Emphasis, RepRange>> = {
  compound: {
    low: { low: 5, high: 7 },
    medium: { low: 8, high: 10 },
    high: { low: 10, high: 12 },
  },
  pull: {
    low: { low: 6, high: 8 },
    medium: { low: 10, high: 12 },
    high: { low: 12, high: 15 },
  },
  isolation: {
    low: { low: 8, high: 10 },
    medium: { low: 12, high: 15 },
    high: { low: 15, high: 20 },
  },
};

// Exercise id (slug) -> category. Anything unlisted defaults to isolation.
const CATEGORY: Record<string, Category> = {
  // heavy compounds
  'barbell-incline-bench-press': 'compound',
  'barbell-bench-press': 'compound',
  'barbell-decline-press': 'compound',
  'machine-leg-press': 'compound',
  // pulls
  'v-bar-pulldown': 'pull',
  'lat-pulldown': 'pull',
  'reverse-grip-pull-down': 'pull',
  'cable-row': 'pull',
  'shotgun-row': 'pull',
};

function categoryFor(exerciseId: string): Category {
  return CATEGORY[exerciseId] ?? 'isolation';
}

export function repRangeFor(exerciseId: string, emphasis: Emphasis): RepRange {
  return RANGES[categoryFor(exerciseId)][emphasis];
}

export const EMPHASES: { id: Emphasis; label: string; hint: string }[] = [
  { id: 'low', label: 'Low', hint: 'heavier' },
  { id: 'medium', label: 'Med', hint: 'moderate' },
  { id: 'high', label: 'High', hint: 'lighter' },
];

export function emphasisLabel(e: Emphasis): string {
  return EMPHASES.find((x) => x.id === e)?.label ?? 'Med';
}
