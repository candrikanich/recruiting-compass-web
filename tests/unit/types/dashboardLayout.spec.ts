import { describe, it, expect } from "vitest";
import { WIDGET_SIZES, WIDGET_LABELS } from "~/types/models";

const ALL_WIDGET_IDS = [
  "interactionTrendChart",
  "schoolInterestChart",
  "schoolMapWidget",
  "performanceSummary",
  "quickTasks",
  "coachFollowupWidget",
  "atAGlanceSummary",
  "schoolStatusOverview",
  "eventsSummary",
  "recentNotifications",
  "linkedAccounts",
] as const;

describe("WIDGET_SIZES", () => {
  it("contains exactly 11 entries", () => {
    expect(Object.keys(WIDGET_SIZES)).toHaveLength(11);
  });

  it("contains all expected widget IDs", () => {
    ALL_WIDGET_IDS.forEach((id) => {
      expect(WIDGET_SIZES).toHaveProperty(id);
    });
  });

  it("only uses valid size values", () => {
    Object.values(WIDGET_SIZES).forEach((size) => {
      expect(["4/6", "2/6"]).toContain(size);
    });
  });

  it("maps known 4/6 widgets correctly", () => {
    expect(WIDGET_SIZES.schoolMapWidget).toBe("4/6");
    expect(WIDGET_SIZES.performanceSummary).toBe("4/6");
    expect(WIDGET_SIZES.coachFollowupWidget).toBe("4/6");
    expect(WIDGET_SIZES.atAGlanceSummary).toBe("4/6");
  });

  it("maps known 2/6 widgets correctly", () => {
    expect(WIDGET_SIZES.interactionTrendChart).toBe("2/6");
    expect(WIDGET_SIZES.schoolInterestChart).toBe("2/6");
    expect(WIDGET_SIZES.quickTasks).toBe("2/6");
    expect(WIDGET_SIZES.eventsSummary).toBe("2/6");
  });
});

describe("WIDGET_LABELS", () => {
  it("has a label for every widget ID in WIDGET_SIZES", () => {
    expect(Object.keys(WIDGET_LABELS).sort()).toEqual(
      Object.keys(WIDGET_SIZES).sort(),
    );
  });

  it("all labels are non-empty strings", () => {
    Object.values(WIDGET_LABELS).forEach((label) => {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    });
  });
});
