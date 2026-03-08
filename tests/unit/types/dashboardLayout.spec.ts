import { describe, it, expect } from "vitest";
import { WIDGET_SIZES, WIDGET_LABELS } from "~/types/models";

describe("DashboardLayout types", () => {
  it("WIDGET_SIZES covers all 11 live widget ids", () => {
    const ids = Object.keys(WIDGET_SIZES);
    expect(ids).toContain("interactionTrendChart");
    expect(ids).toContain("schoolMapWidget");
    expect(ids).toContain("atAGlanceSummary");
    expect(ids).toHaveLength(11);
  });

  it("WIDGET_LABELS has a label for every widget id", () => {
    expect(Object.keys(WIDGET_LABELS)).toEqual(Object.keys(WIDGET_SIZES));
  });

  it("only 4/6 or 2/6 sizes are used", () => {
    const sizes = Object.values(WIDGET_SIZES);
    sizes.forEach((s) => expect(["4/6", "2/6"]).toContain(s));
  });
});
