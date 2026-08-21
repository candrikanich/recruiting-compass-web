/**
 * Baseball-convention display formatting for performance-metric values, keyed by metric type.
 * Single source of truth on web; must stay byte-identical to iOS `MetricType.format(_:)`.
 *
 * Rules: batting average → 3 decimals dropping the leading zero (.410); ERA → 2 decimals
 * keeping the leading digit (3.45); velocity / exit velo → 1 decimal (82.3); 60-yard & pop
 * times → 2 decimals (7.23); strikeouts → integer; other → 2 decimals. Unknown/absent types
 * fall back to a plain integer-or-raw string (mirrors the iOS template fallback).
 *
 * Number only — callers append the unit.
 */
const FRACTION_DIGITS: Record<string, number> = {
  batting_avg: 3,
  era: 2,
  sixty_time: 2,
  pop_time: 2,
  other: 2,
  velocity: 1,
  exit_velo: 1,
  strikeouts: 0,
};

export function formatMetricValue(
  metricType: string | null | undefined,
  value: number,
): string {
  const digits = metricType == null ? undefined : FRACTION_DIGITS[metricType];
  if (digits === undefined) return String(value); // unknown type: plain integer-or-raw
  const s = value.toFixed(digits);
  if (metricType === "batting_avg" && s.startsWith("0.")) return s.slice(1);
  return s;
}
