/**
 * InBody scan history.
 *
 * Unlike workout data (user-owned, in localStorage), this lives in source and
 * is maintained by hand from the scan printouts. Readings are infrequent, so a
 * rebuild per entry is fine, and keeping it here means the numbers are always
 * available for analysis alongside the training data.
 *
 * ALL VALUES ARE NORMALIZED TO POUNDS. Scans taken on kg machines are converted
 * on entry (x 2.20462) and the original figures are noted in a comment on the
 * reading, so nothing from the printout is lost.
 *
 * Fields are optional where a machine doesn't report them: the older unit gives
 * WHR and a fitness score, the InBody 570 gives visceral fat, SMI and the
 * water split instead.
 */

export interface Segments {
  rightArm: number;
  leftArm: number;
  trunk: number;
  rightLeg: number;
  leftLeg: number;
}

export interface BodyReading {
  /** ISO date of the scan (local calendar day). */
  date: string;
  /** Where it was taken / which machine. */
  source: string;
  weight: number;
  /** Fat-free mass (the 570 calls this Lean Body Mass). */
  leanBodyMass: number;
  bodyFatMass: number;
  skeletalMuscleMass: number;
  bodyFatPct: number;
  bmi: number;
  /** Basal metabolic rate, kcal. Tracks lean mass closely. */
  bmr: number;
  totalBodyWater?: number;
  dryLeanMass?: number;
  intracellularWater?: number;
  extracellularWater?: number;
  ecwTbw?: number;
  visceralFat?: number;
  /** Skeletal muscle index, kg/m^2. */
  smi?: number;
  waistHipRatio?: number;
  fitnessScore?: number;
  segmentalLean?: Segments;
  segmentalFat?: Segments;
  note?: string;
}

/** Height used for FFMI. 5 ft 11 in. */
export const HEIGHT_M = 1.8034;

/** Fat-free mass index: lean mass (kg) / height (m)^2. */
export function ffmi(r: BodyReading): number {
  const leanKg = r.leanBodyMass / 2.20462;
  return leanKg / (HEIGHT_M * HEIGHT_M);
}

/** Oldest first. */
export const BODY_READINGS: BodyReading[] = [
  {
    // Original printout in kg: weight 72.3, SMM 36.5, body fat 8.1, TBW 47.1,
    // FFM 64.2, protein 12.8, mineral 4.25. Segmental lean kg: RA 3.8, LA 4.0,
    // trunk 29.5, RL 10.0, LL 10.0. Segmental fat kg: RA 0.2, LA 0.2,
    // trunk 3.9, RL 1.3, LL 1.3.
    date: '2024-11-26',
    source: 'Fitness First @ DCC',
    weight: 159.4,
    leanBodyMass: 141.5,
    bodyFatMass: 17.9,
    skeletalMuscleMass: 80.5,
    bodyFatPct: 11.2,
    bmi: 22.3,
    bmr: 1756,
    totalBodyWater: 103.8,
    dryLeanMass: 37.7,
    waistHipRatio: 0.85,
    fitnessScore: 84,
    segmentalLean: { rightArm: 8.4, leftArm: 8.8, trunk: 65.0, rightLeg: 22.0, leftLeg: 22.0 },
    segmentalFat: { rightArm: 0.4, leftArm: 0.4, trunk: 8.6, rightLeg: 2.9, leftLeg: 2.9 },
    note: 'Pre-effort baseline. Lean and light.',
  },
  {
    date: '2026-06-18',
    source: 'InBody 570',
    weight: 177.5,
    leanBodyMass: 143.1,
    bodyFatMass: 34.4,
    skeletalMuscleMass: 82.0,
    bodyFatPct: 19.4,
    bmi: 24.8,
    bmr: 1772,
    totalBodyWater: 104.7,
    dryLeanMass: 38.4,
    intracellularWater: 66.1,
    extracellularWater: 38.6,
    ecwTbw: 0.368,
    visceralFat: 6,
    smi: 8.5,
    segmentalLean: { rightArm: 8.14, leftArm: 8.05, trunk: 63.1, rightLeg: 22.31, leftLeg: 22.18 },
    segmentalFat: { rightArm: 1.8, leftArm: 1.8, trunk: 18.5, rightLeg: 4.9, leftLeg: 4.9 },
    note: 'Two days before the first logged Sandwich session. Baseline for the consistent phase.',
  },
];
