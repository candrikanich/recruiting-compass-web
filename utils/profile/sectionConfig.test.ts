import { describe, it, expect } from "vitest";
import {
  DEFAULT_SECTION_ORDER,
  backfillSectionConfig,
  normalizeSectionConfig,
  isSectionVisible,
} from "./sectionConfig";

describe("sectionConfig", () => {
  it("backfills from show_* flags with metrics hidden by default", () => {
    const s = backfillSectionConfig({ show_film: true, show_academics: false });
    expect(isSectionVisible(s, "film")).toBe(true);
    expect(isSectionVisible(s, "academics")).toBe(false);
    expect(isSectionVisible(s, "metrics")).toBe(false);
    expect(s.map((x) => x.key)).toEqual(DEFAULT_SECTION_ORDER);
  });

  it("normalizes: drops unknown keys, appends missing as hidden, keeps order", () => {
    const raw = [
      { key: "awards", visible: true },
      { key: "bogus", visible: true },
      { key: "film", visible: true },
    ];
    const s = normalizeSectionConfig(raw);
    expect(s.map((x) => x.key)).toEqual([
      "awards",
      "film",
      "metrics",
      "academics",
      "values",
      "team_history",
    ]);
    expect(isSectionVisible(s, "film")).toBe(true);
    expect(isSectionVisible(s, "metrics")).toBe(false);
  });

  it("normalizes empty/garbage to full default (all hidden except backfill rules)", () => {
    expect(normalizeSectionConfig(null).map((x) => x.key)).toEqual(
      DEFAULT_SECTION_ORDER,
    );
    expect(normalizeSectionConfig("nope").length).toBe(DEFAULT_SECTION_ORDER.length);
  });
});
