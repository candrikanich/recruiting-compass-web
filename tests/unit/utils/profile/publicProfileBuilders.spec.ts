import { describe, it, expect } from "vitest";
import { buildPublicMetrics } from "~/utils/profile/publicProfileBuilders";

describe("buildPublicMetrics", () => {
  it("formats values via the canonical registry, ignoring stale DB unit/display_value", () => {
    // Real-world garbage row: batting_avg stored with unit "unit" and an
    // unformatted value. Canonical format wins: 0.41 -> ".410", unit dropped.
    const [metric] = buildPublicMetrics([
      {
        metric_type: "batting_avg",
        value: 0.41,
        unit: "unit",
        display_value: null,
        verified: false,
        is_primary: false,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(metric.value).toBe(".410");
    expect(metric.unit).toBeNull();
    expect(metric.label).toBe("Batting Average");
  });

  it("keeps the newest row when a metric_type is logged more than once", () => {
    const metrics = buildPublicMetrics([
      {
        metric_type: "velocity",
        value: 77.3,
        unit: "mph",
        verified: true,
        is_primary: false,
        created_at: "2025-06-01T00:00:00Z",
      },
      {
        metric_type: "velocity",
        value: 82.3,
        unit: "mph",
        verified: true,
        is_primary: false,
        created_at: "2026-05-01T00:00:00Z",
      },
    ]);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe("82.3");
    expect(metrics[0].label).toBe("Fastball Velocity");
    expect(metrics[0].unit).toBe("mph");
  });

  it("ranks primary + verified first and caps at six cards", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      metric_type: `custom_${i}`,
      value: i,
      verified: i < 2,
      is_primary: i === 0,
      created_at: `2026-01-0${i + 1}T00:00:00Z`,
    }));
    const metrics = buildPublicMetrics(rows);
    expect(metrics).toHaveLength(6);
    expect(metrics[0].key).toBe("custom_0"); // primary ranks first
  });
});
