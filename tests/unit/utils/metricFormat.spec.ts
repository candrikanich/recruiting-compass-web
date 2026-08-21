import { describe, it, expect } from "vitest";
import { formatMetricValue } from "~/utils/metricFormat";

// Parity with iOS MetricTypeFormatTests — keep the two in lockstep.
describe("formatMetricValue", () => {
  it("batting_avg: 3 decimals, drops the leading zero", () => {
    expect(formatMetricValue("batting_avg", 0.41)).toBe(".410");
    expect(formatMetricValue("batting_avg", 0.4)).toBe(".400");
    expect(formatMetricValue("batting_avg", 0)).toBe(".000");
  });

  it("batting_avg >= 1 keeps the leading digit", () => {
    expect(formatMetricValue("batting_avg", 1.0)).toBe("1.000");
    expect(formatMetricValue("batting_avg", 1.5)).toBe("1.500");
  });

  it("era: 2 decimals, keeps the leading digit", () => {
    expect(formatMetricValue("era", 3.45)).toBe("3.45");
    expect(formatMetricValue("era", 0)).toBe("0.00");
    expect(formatMetricValue("era", 12)).toBe("12.00");
  });

  it("velocity / exit_velo: 1 decimal", () => {
    expect(formatMetricValue("velocity", 82.3)).toBe("82.3");
    expect(formatMetricValue("velocity", 82.3001)).toBe("82.3");
    expect(formatMetricValue("exit_velo", 92.1)).toBe("92.1");
    expect(formatMetricValue("velocity", 88)).toBe("88.0");
  });

  it("times: 2 decimals", () => {
    expect(formatMetricValue("sixty_time", 7.23)).toBe("7.23");
    expect(formatMetricValue("pop_time", 1.95)).toBe("1.95");
  });

  it("strikeouts: integer", () => {
    expect(formatMetricValue("strikeouts", 12)).toBe("12");
    expect(formatMetricValue("strikeouts", 12.0)).toBe("12");
  });

  it("other: 2 decimals, keeps leading zero", () => {
    expect(formatMetricValue("other", 4.5)).toBe("4.50");
    expect(formatMetricValue("other", 0.5)).toBe("0.50");
  });

  it("unknown / null type: plain integer-or-raw", () => {
    expect(formatMetricValue(null, 88)).toBe("88");
    expect(formatMetricValue(undefined, 88.3)).toBe("88.3");
    expect(formatMetricValue("bogus", 42)).toBe("42");
  });
});
