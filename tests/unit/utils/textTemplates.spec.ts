import { describe, it, expect } from "vitest";
import {
  generateCoachEmailTemplate,
  generateEventSummaryTemplate,
  getMetricLabel,
} from "~/utils/textTemplates";
import type { PerformanceMetric, Event } from "~/types/models";

function makeMetric(
  overrides: Partial<PerformanceMetric> = {},
): PerformanceMetric {
  return {
    id: "metric-1",
    recorded_date: "2026-01-15",
    metric_type: "velocity",
    value: 88,
    unit: "mph",
    verified: true,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    type: "showcase",
    name: "Spring Showcase",
    location: "Chicago, IL",
    start_date: "2026-04-10",
    registered: true,
    attended: true,
    ...overrides,
  };
}

describe("generateCoachEmailTemplate", () => {
  it("returns no-metrics template when metrics array is empty", () => {
    const result = generateCoachEmailTemplate("Alex Smith", "Johnson", []);
    expect(result).toContain("Subject: Alex Smith - Performance Update");
    expect(result).toContain("Hi Coach Johnson,");
    expect(result).toContain("No metrics available for the selected date range");
    expect(result).toContain("Alex Smith");
    expect(result).not.toContain("KEY HIGHLIGHTS");
  });

  it("returns full template with highlights when metrics are provided", () => {
    const metrics = [makeMetric()];
    const result = generateCoachEmailTemplate("Alex Smith", "Johnson", metrics);
    expect(result).toContain("Subject: Alex Smith - Performance Update");
    expect(result).toContain("Hi Coach Johnson,");
    expect(result).toContain("KEY HIGHLIGHTS:");
    expect(result).toContain("VELOCITY: 88 mph");
    expect(result).toContain("Alex Smith");
  });

  it("includes date range in template when metrics are provided", () => {
    const metrics = [
      makeMetric({ recorded_date: "2026-01-01", metric_type: "velocity", value: 85 }),
      makeMetric({ id: "metric-2", recorded_date: "2026-03-01", metric_type: "exit_velo", value: 92 }),
    ];
    const result = generateCoachEmailTemplate("Jordan Lee", "Williams", metrics);
    expect(result).toContain("recent performance metrics from");
    expect(result).toContain("KEY HIGHLIGHTS:");
  });

  it("deduplicates metrics by type and keeps latest when multiple of same type", () => {
    const metrics = [
      makeMetric({ id: "m1", recorded_date: "2026-01-01", metric_type: "velocity", value: 85 }),
      makeMetric({ id: "m2", recorded_date: "2026-03-01", metric_type: "velocity", value: 90 }),
    ];
    const result = generateCoachEmailTemplate("Alex", "Coach", metrics);
    // Latest value (90) should appear, old value (85) should not appear as separate entry
    // Both dates should influence the date range but only one VELOCITY line
    const velocityMatches = (result.match(/VELOCITY:/g) || []).length;
    expect(velocityMatches).toBe(1);
    expect(result).toContain("90 mph");
  });

  it("formats metric type with underscores replaced by spaces and uppercased", () => {
    const metrics = [makeMetric({ metric_type: "exit_velo", value: 95, unit: "mph" })];
    const result = generateCoachEmailTemplate("Sam", "Brown", metrics);
    expect(result).toContain("EXIT VELO: 95 mph");
  });

  it("includes verified evaluators line in non-empty metrics template", () => {
    const metrics = [makeMetric()];
    const result = generateCoachEmailTemplate("Alex", "Coach", metrics);
    expect(result).toContain(
      "All metrics are verified by third-party evaluators",
    );
  });
});

describe("generateEventSummaryTemplate", () => {
  it("includes event name and athlete name in header", () => {
    const event = makeEvent();
    const result = generateEventSummaryTemplate(event, [], "Jordan Lee");
    expect(result).toContain("Jordan Lee - Spring Showcase Performance Summary");
    expect(result).toContain("Event: Spring Showcase");
  });

  it("includes formatted start date", () => {
    const event = makeEvent({ start_date: "2026-04-10" });
    const result = generateEventSummaryTemplate(event, [], "Jordan Lee");
    expect(result).toContain("Date:");
  });

  it("includes location when provided", () => {
    const event = makeEvent({ location: "Chicago, IL" });
    const result = generateEventSummaryTemplate(event, [], "Jordan Lee");
    expect(result).toContain("Location: Chicago, IL");
  });

  it('includes "N/A" when location is null', () => {
    const event = makeEvent({ location: null });
    const result = generateEventSummaryTemplate(event, [], "Jordan Lee");
    expect(result).toContain("Location: N/A");
  });

  it('shows "No metrics recorded" when metrics array is empty', () => {
    const event = makeEvent();
    const result = generateEventSummaryTemplate(event, [], "Jordan Lee");
    expect(result).toContain("No metrics recorded");
  });

  it("lists each metric when metrics are provided", () => {
    const event = makeEvent();
    const metrics = [
      makeMetric({ metric_type: "velocity", value: 88, unit: "mph" }),
      makeMetric({ id: "m2", metric_type: "exit_velo", value: 102, unit: "mph" }),
    ];
    const result = generateEventSummaryTemplate(event, metrics, "Alex");
    expect(result).toContain("VELOCITY: 88 mph");
    expect(result).toContain("EXIT VELO: 102 mph");
    expect(result).not.toContain("No metrics recorded");
  });

  it("includes performance notes when provided", () => {
    const event = makeEvent({
      performance_notes: "Great velocity, consistent mechanics",
    });
    const result = generateEventSummaryTemplate(event, [], "Jordan");
    expect(result).toContain("Great velocity, consistent mechanics");
  });

  it('shows "No notes recorded" when performance_notes is null', () => {
    const event = makeEvent({ performance_notes: null });
    const result = generateEventSummaryTemplate(event, [], "Jordan");
    expect(result).toContain("No notes recorded");
  });

  it('shows "No notes recorded" when performance_notes is undefined', () => {
    const event = makeEvent({ performance_notes: undefined });
    const result = generateEventSummaryTemplate(event, [], "Jordan");
    expect(result).toContain("No notes recorded");
  });

  it("includes Generated date line", () => {
    const event = makeEvent();
    const result = generateEventSummaryTemplate(event, [], "Jordan");
    expect(result).toContain("Generated:");
  });
});

describe("getMetricLabel", () => {
  it("returns Fastball Velocity for velocity", () => {
    expect(getMetricLabel("velocity")).toBe("Fastball Velocity");
  });

  it("returns Exit Velocity for exit_velo", () => {
    expect(getMetricLabel("exit_velo")).toBe("Exit Velocity");
  });

  it("returns 60-Yard Dash for sixty_time", () => {
    expect(getMetricLabel("sixty_time")).toBe("60-Yard Dash");
  });

  it("returns Pop Time for pop_time", () => {
    expect(getMetricLabel("pop_time")).toBe("Pop Time");
  });

  it("returns Batting Average for batting_avg", () => {
    expect(getMetricLabel("batting_avg")).toBe("Batting Average");
  });

  it("returns ERA for era", () => {
    expect(getMetricLabel("era")).toBe("ERA");
  });

  it("returns Strikeouts for strikeouts", () => {
    expect(getMetricLabel("strikeouts")).toBe("Strikeouts");
  });

  it("returns Other Metric for other", () => {
    expect(getMetricLabel("other")).toBe("Other Metric");
  });

  it("returns the raw type string for unknown metric type", () => {
    expect(getMetricLabel("custom_metric")).toBe("custom_metric");
  });

  it("returns the raw type string for empty string", () => {
    expect(getMetricLabel("")).toBe("");
  });
});
