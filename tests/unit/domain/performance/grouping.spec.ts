import { describe, expect, it } from "vitest";
import { groupMetricsByType, latestMetricsByType } from "~/domain/performance";
import type { PerformanceMetric } from "~/types/models";

function metric(
  overrides: Partial<PerformanceMetric> & { id: string; metric_type: string },
): PerformanceMetric {
  return {
    user_id: "u1",
    recorded_date: "2024-01-01T00:00:00Z",
    value: 1,
    unit: "mph",
    verified: false,
    ...overrides,
  };
}

describe("domain/performance grouping", () => {
  it("groups metrics by type", () => {
    const grouped = groupMetricsByType([
      metric({ id: "a", metric_type: "exit_velo" }),
      metric({ id: "b", metric_type: "exit_velo" }),
      metric({ id: "c", metric_type: "velocity" }),
    ]);
    expect(grouped.exit_velo).toHaveLength(2);
    expect(grouped.velocity).toHaveLength(1);
  });

  it("picks the latest row per type by recorded_date", () => {
    const latest = latestMetricsByType([
      metric({
        id: "old",
        metric_type: "exit_velo",
        recorded_date: "2024-01-01T00:00:00Z",
      }),
      metric({
        id: "new",
        metric_type: "exit_velo",
        recorded_date: "2024-06-01T00:00:00Z",
      }),
      metric({
        id: "v1",
        metric_type: "velocity",
        recorded_date: "2024-03-01T00:00:00Z",
      }),
    ]);
    expect(latest.exit_velo.id).toBe("new");
    expect(latest.velocity.id).toBe("v1");
  });
});
