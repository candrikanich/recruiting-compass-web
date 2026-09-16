/**
 * Maps a US zip code to its state via the standard USPS 3-digit zip-prefix
 * ranges. Approximate at range boundaries (a handful of prefixes are split
 * across states) but sufficient as a location signal, not for mail routing.
 */

interface ZipRange {
  min: number;
  max: number;
  state: string;
}

const ZIP_PREFIX_RANGES: ZipRange[] = [
  { min: 6, max: 7, state: "PR" },
  { min: 8, max: 8, state: "VI" },
  { min: 9, max: 9, state: "PR" },
  { min: 10, max: 27, state: "MA" },
  { min: 28, max: 29, state: "RI" },
  { min: 30, max: 38, state: "NH" },
  { min: 39, max: 49, state: "ME" },
  { min: 50, max: 59, state: "VT" },
  { min: 60, max: 69, state: "CT" },
  { min: 70, max: 89, state: "NJ" },
  { min: 100, max: 149, state: "NY" },
  { min: 150, max: 196, state: "PA" },
  { min: 197, max: 199, state: "DE" },
  { min: 200, max: 205, state: "DC" },
  { min: 206, max: 219, state: "MD" },
  { min: 220, max: 246, state: "VA" },
  { min: 247, max: 268, state: "WV" },
  { min: 270, max: 289, state: "NC" },
  { min: 290, max: 299, state: "SC" },
  { min: 300, max: 319, state: "GA" },
  { min: 320, max: 339, state: "FL" },
  { min: 341, max: 342, state: "FL" },
  { min: 344, max: 344, state: "FL" },
  { min: 346, max: 347, state: "FL" },
  { min: 349, max: 349, state: "FL" },
  { min: 350, max: 369, state: "AL" },
  { min: 370, max: 385, state: "TN" },
  { min: 386, max: 397, state: "MS" },
  { min: 398, max: 399, state: "GA" },
  { min: 400, max: 427, state: "KY" },
  { min: 430, max: 459, state: "OH" },
  { min: 460, max: 479, state: "IN" },
  { min: 480, max: 499, state: "MI" },
  { min: 500, max: 528, state: "IA" },
  { min: 530, max: 549, state: "WI" },
  { min: 550, max: 567, state: "MN" },
  { min: 570, max: 577, state: "SD" },
  { min: 580, max: 588, state: "ND" },
  { min: 590, max: 599, state: "MT" },
  { min: 600, max: 629, state: "IL" },
  { min: 630, max: 658, state: "MO" },
  { min: 660, max: 679, state: "KS" },
  { min: 680, max: 693, state: "NE" },
  { min: 700, max: 714, state: "LA" },
  { min: 716, max: 729, state: "AR" },
  { min: 730, max: 749, state: "OK" },
  { min: 750, max: 799, state: "TX" },
  { min: 885, max: 885, state: "TX" },
  { min: 800, max: 816, state: "CO" },
  { min: 820, max: 831, state: "WY" },
  { min: 832, max: 838, state: "ID" },
  { min: 840, max: 847, state: "UT" },
  { min: 850, max: 865, state: "AZ" },
  { min: 870, max: 884, state: "NM" },
  { min: 889, max: 898, state: "NV" },
  { min: 900, max: 961, state: "CA" },
  { min: 967, max: 968, state: "HI" },
  { min: 969, max: 969, state: "GU" },
  { min: 970, max: 979, state: "OR" },
  { min: 980, max: 994, state: "WA" },
  { min: 995, max: 999, state: "AK" },
];

/**
 * Five-digit overrides for zips whose 3-digit prefix range spans multiple
 * territories/states. Checked before the prefix ranges below.
 */
const ZIP_FIVE_DIGIT_OVERRIDES: Record<string, string> = {
  "96799": "AS", // American Samoa — sits inside the 967-968 Hawaii prefix range
};

/**
 * Resolves a US zip code to a 2-letter state code, or null if unrecognized/invalid.
 * Accepts 5-digit, ZIP+4 ("12345-6789"), and bare 9-digit ("123456789") forms —
 * the first 5 digits determine the state in all of these.
 */
export function zipToState(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const trimmed = zip.trim();
  if (!/^\d{5}(-?\d{4})?$/.test(trimmed)) return null;

  const fiveDigit = trimmed.slice(0, 5);

  const override = ZIP_FIVE_DIGIT_OVERRIDES[fiveDigit];
  if (override) return override;

  const prefix = Number(fiveDigit.slice(0, 3));
  const range = ZIP_PREFIX_RANGES.find(
    (r) => prefix >= r.min && prefix <= r.max,
  );
  return range?.state ?? null;
}
