import { describe, it, expect } from "vitest";
import {
  recentForJob,
  consecutiveFailures,
  sparklineData,
} from "~/utils/cronDashboard";

const rows = [
  {
    job_name: "a",
    status: "error",
    duration_ms: 10,
    started_at: "2026-08-17T05:00:00Z",
  },
  {
    job_name: "a",
    status: "error",
    duration_ms: 12,
    started_at: "2026-08-16T05:00:00Z",
  },
  {
    job_name: "a",
    status: "success",
    duration_ms: 8,
    started_at: "2026-08-15T05:00:00Z",
  },
  {
    job_name: "b",
    status: "success",
    duration_ms: 5,
    started_at: "2026-08-17T05:00:00Z",
  },
] as any[];

describe("cronDashboard", () => {
  it("recentForJob filters + caps", () => {
    expect(recentForJob(rows, "a", 2)).toHaveLength(2);
    expect(recentForJob(rows, "b", 5)).toHaveLength(1);
  });
  it("consecutiveFailures counts trailing non-success (most-recent-first input)", () => {
    expect(consecutiveFailures(rows, "a")).toBe(2);
    expect(consecutiveFailures(rows, "b")).toBe(0);
  });
  it("sparklineData returns a chart dataset for a job", () => {
    const d = sparklineData(rows, "a");
    expect(d.datasets[0].data.length).toBeGreaterThan(0);
  });
});
