import { describe, it, expect } from "vitest";
import { WIDGET_SIZES, WIDGET_LABELS } from "~/types/models";

describe("dashboard widget config", () => {
  it("WIDGET_SIZES only uses valid size values", () => {
    Object.values(WIDGET_SIZES).forEach((size) => {
      expect(["4/6", "2/6"]).toContain(size);
    });
  });

  it("every widget in WIDGET_SIZES has a label in WIDGET_LABELS", () => {
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
