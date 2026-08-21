/**
 * Display formatting for performance-metric values, keyed by metric type.
 * Single source of truth on web; byte-identical to iOS `MetricType.format(_:)`.
 *
 * Delegates to the canonical metric registry (`utils/metrics/canonical.ts`):
 * known types format via their `MetricDef.format` (decimal/integer/percent/
 * duration), unknown/absent types fall back to a plain integer-or-raw string
 * (mirrors the iOS template fallback).
 *
 * Number only — callers append the unit.
 */
import { applyFormat, getKnownMetricDef } from "./metrics/canonical";

export function formatMetricValue(
  metricType: string | null | undefined,
  value: number,
): string {
  const def = getKnownMetricDef(metricType);
  if (!def) return String(value); // unknown type: plain integer-or-raw
  return applyFormat(def.format, value);
}
