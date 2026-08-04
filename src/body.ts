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

/**
 * Written evaluation of a scan, kept alongside the numbers so the reasoning
 * is readable in the app rather than living in a chat log. Each one judges the
 * scan against the readings before it where there are any.
 */
export interface Insight {
  /** One-line verdict. */
  headline: string;
  /** Supporting analysis, one paragraph per entry. */
  points: string[];
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
  insight?: Insight;
}

/**
 * Height, used for FFMI (the only stat derived here that needs it). Confirmed
 * by both printouts: the 2024 sheet records 180 cm, the 2026 sheet 5 ft 11.0 in.
 */
export const HEIGHT_M = 1.8034;
export const HEIGHT_LABEL = `5'11" (180 cm)`;

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
    insight: {
      headline: 'Lean and light. Needed mass, not fat loss.',
      points: [
        'Genuinely lean at 11.2% body fat. Fat mass of 17.9 lb sat below the machine\'s own normal floor, so the reading flagged it as under rather than healthy-low. Skeletal muscle of 80.5 lb landed near the top of the general-population band, meaning reasonably developed for a non-lifter but not for someone training seriously.',
        'FFMI of 19.8 places this above an untrained average of roughly 18 to 19, and below the 21 to 23 range typical of a consistently trained lifter. Combined with the low fat, this is the classic starting point where the constraint is total mass rather than composition.',
        'Arms were already the thinnest link. Both arms together carried 17.2 lb of lean tissue against 65.0 lb in the trunk. The 8.8 versus 8.4 left-side edge is within ordinary variation and not worth acting on.',
        'The correct read at this point was to eat in a surplus and add size. Nothing here justified a cut. What follows shows that the direction was right and the rate was not.',
      ],
    },
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
    insight: {
      headline: '18 lb gained over 19 months, 16.5 of it fat. Lean mass essentially flat.',
      points: [
        'The split is the headline. Weight rose 18.1 lb, fat mass rose 16.5 lb, and lean body mass moved 1.6 lb. Roughly 91% of the gain was fat. Skeletal muscle moved 1.5 lb over the same window, which agrees.',
        'A second number corroborates it independently. BMR rose only 16 kcal, from 1756 to 1772. Basal rate tracks lean tissue closely, so a near-flat BMR is what you would expect if very little muscle was added. Two separately derived figures pointing the same way is stronger evidence than either alone.',
        'The fat went central. The trunk holds 18.5 lb of the 34.4 lb total, and the machine rates trunk fat at 185% of ideal against 118 to 121% for the arms and legs. That distribution is typical, and it is also the one that works hardest against a visible taper, since it thickens the waist and buries the abdominal wall.',
        'Nothing here is a health concern. Visceral fat of 6 sits under the threshold of 10, ECW/TBW of 0.368 indicates normal fluid balance, and SMI of 8.5 is far clear of any muscle-loss flag. This is a composition problem, not a medical one.',
        'Treat the segmental comparison with caution. This scan came from an InBody 570 running 5, 50 and 500 kHz, while the 2024 scan used a different unit at 20 and 100 kHz. Gross composition shifts of this size are far too large to be device error, but the limb-by-limb numbers should not be read as trends across the two sheets.',
        'Most importantly, this is not a verdict on the current program. The window covers the fragmented on-and-off period plus the fast bulk, and it closes two days before the first logged Sandwich session. It measures what came before the consistent phase, not the consistent phase itself.',
      ],
    },
  },
];
