import type { Emphasis } from '../types';

/**
 * Per-exercise hypertrophy rep target (a single fixed number).
 *
 * Expert consensus (Schoenfeld, Israetel/RP, Helms): growth happens across a
 * broad range near failure, but the practical sweet spot depends on the lift:
 *  - heavy compounds load well and fatigue a lot -> lower reps
 *  - vertical/horizontal pulls -> moderate reps
 *  - isolations / cables -> higher reps (metabolic stress, safer loaded light)
 *
 * The session-wide Low/Medium/High pick shifts every exercise's target while
 * keeping it appropriate for the exercise type.
 */
type Category = 'compound' | 'pull' | 'isolation';

const REPS: Record<Category, Record<Emphasis, number>> = {
  compound: { low: 6, medium: 8, high: 10 },
  pull: { low: 8, medium: 10, high: 12 },
  isolation: { low: 10, medium: 12, high: 14 },
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

export function repsFor(exerciseId: string, emphasis: Emphasis): number {
  return REPS[categoryFor(exerciseId)][emphasis];
}

// Rough starting weights (lb) used only until there's logged history to learn from.
const DEFAULT_WEIGHT: Record<Category, number> = {
  compound: 95,
  pull: 80,
  isolation: 20,
};

export function defaultWeightFor(exerciseId: string): number {
  return DEFAULT_WEIGHT[categoryFor(exerciseId)];
}

export const EMPHASES: { id: Emphasis; label: string; hint: string }[] = [
  { id: 'low', label: 'Low', hint: 'heavier' },
  { id: 'medium', label: 'Mid', hint: 'moderate' },
  { id: 'high', label: 'High', hint: 'lighter' },
];

export function emphasisLabel(e: Emphasis): string {
  return EMPHASES.find((x) => x.id === e)?.label ?? 'Med';
}
