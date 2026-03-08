import { describe, it, expect } from "vitest";
import {
  validateDashboardLayout,
  getDefaultDashboardLayout,
} from "~/utils/preferenceValidation";
import { WIDGET_SIZES } from "~/types/models";

describe("validateDashboardLayout", () => {
  it("returns null for empty object", () => {
    expect(validateDashboardLayout({})).toBeNull();
  });

  it("returns null for null input", () => {
    expect(validateDashboardLayout(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(validateDashboardLayout(undefined)).toBeNull();
  });

  it("returns null for old boolean format (has 'widgets' key)", () => {
    const old = {
      statsCards: { coaches: true },
      widgets: { atAGlanceSummary: false },
    };
    expect(validateDashboardLayout(old)).toBeNull();
  });

  it("returns null when leftColumn or rightColumn is missing", () => {
    const incomplete = {
      statsCards: { coaches: true, schools: true, interactions: true, offers: true, events: true },
      leftColumn: [],
      // missing rightColumn
    };
    expect(validateDashboardLayout(incomplete)).toBeNull();
  });

  it("returns a valid DashboardLayout for correct new format", () => {
    const input = {
      statsCards: { coaches: false, schools: true, interactions: true, offers: true, events: false },
      leftColumn: [{ id: "schoolMapWidget", visible: true }],
      rightColumn: [{ id: "eventsSummary", visible: false }],
    };
    const result = validateDashboardLayout(input);
    expect(result).not.toBeNull();
    expect(result!.statsCards.coaches).toBe(false);
    expect(result!.statsCards.schools).toBe(true);
    expect(result!.leftColumn).toHaveLength(1);
    expect(result!.leftColumn[0].id).toBe("schoolMapWidget");
    expect(result!.leftColumn[0].visible).toBe(true);
    expect(result!.rightColumn[0].visible).toBe(false);
  });

  it("filters out unknown widget ids from columns", () => {
    const input = {
      statsCards: { coaches: true, schools: true, interactions: true, offers: true, events: true },
      leftColumn: [
        { id: "schoolMapWidget", visible: true },
        { id: "unknownWidget", visible: true },
        { id: "anotherFake", visible: false },
      ],
      rightColumn: [],
    };
    const result = validateDashboardLayout(input);
    expect(result!.leftColumn).toHaveLength(1);
    expect(result!.leftColumn[0].id).toBe("schoolMapWidget");
  });

  it("defaults missing statsCard fields to true", () => {
    const input = {
      statsCards: {},
      leftColumn: [],
      rightColumn: [],
    };
    const result = validateDashboardLayout(input);
    expect(result!.statsCards.coaches).toBe(true);
    expect(result!.statsCards.events).toBe(true);
  });
});

describe("getDefaultDashboardLayout", () => {
  it("returns all statsCards as true", () => {
    const layout = getDefaultDashboardLayout();
    expect(layout.statsCards.coaches).toBe(true);
    expect(layout.statsCards.schools).toBe(true);
    expect(layout.statsCards.interactions).toBe(true);
    expect(layout.statsCards.offers).toBe(true);
    expect(layout.statsCards.events).toBe(true);
  });

  it("leftColumn has 7 widgets all visible", () => {
    const layout = getDefaultDashboardLayout();
    expect(layout.leftColumn).toHaveLength(7);
    expect(layout.leftColumn.every((w) => w.visible)).toBe(true);
  });

  it("rightColumn has 4 widgets all visible", () => {
    const layout = getDefaultDashboardLayout();
    expect(layout.rightColumn).toHaveLength(4);
    expect(layout.rightColumn.every((w) => w.visible)).toBe(true);
  });

  it("rightColumn contains only 2/6 widgets", () => {
    const layout = getDefaultDashboardLayout();
    layout.rightColumn.forEach((w) => {
      expect(WIDGET_SIZES[w.id]).toBe("2/6");
    });
  });

  it("leftColumn contains specific expected widget ids", () => {
    const layout = getDefaultDashboardLayout();
    const ids = layout.leftColumn.map((w) => w.id);
    expect(ids).toContain("schoolMapWidget");
    expect(ids).toContain("interactionTrendChart");
    expect(ids).toContain("atAGlanceSummary");
  });
});
