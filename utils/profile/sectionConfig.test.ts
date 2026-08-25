import { describe, it, expect } from "vitest";
import {
  DEFAULT_SECTION_ORDER,
  backfillSectionConfig,
  normalizeSectionConfig,
  isSectionVisible,
  resolveSections,
} from "./sectionConfig";

describe("sectionConfig", () => {
  it("backfills from show_* flags with metrics hidden by default", () => {
    const s = backfillSectionConfig({ show_film: true, show_academics: false });
    expect(isSectionVisible(s, "film")).toBe(true);
    expect(isSectionVisible(s, "academics")).toBe(false);
    expect(isSectionVisible(s, "metrics")).toBe(false);
    expect(isSectionVisible(s, "values")).toBe(true);
    expect(isSectionVisible(s, "team_history")).toBe(true);
    expect(isSectionVisible(s, "awards")).toBe(true);
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

  it("deduplicates: keeps first occurrence, drops duplicates", () => {
    const raw = [
      { key: "film", visible: true },
      { key: "film", visible: false },
    ];
    const s = normalizeSectionConfig(raw);
    expect(s.filter((x) => x.key === "film")).toHaveLength(1);
    expect(isSectionVisible(s, "film")).toBe(true);
  });

  it("normalizes empty/garbage to full default (all hidden except backfill rules)", () => {
    const nullResult = normalizeSectionConfig(null);
    expect(nullResult.map((x) => x.key)).toEqual(DEFAULT_SECTION_ORDER);
    nullResult.forEach((x) => expect(x.visible).toBe(false));

    const garbageResult = normalizeSectionConfig("nope");
    expect(garbageResult.length).toBe(DEFAULT_SECTION_ORDER.length);
    garbageResult.forEach((x) => expect(x.visible).toBe(false));
  });
});

describe("resolveSections", () => {
  it("backfills when section_config is empty, honoring show_* for their keys", () => {
    const s = resolveSections({
      section_config: [],
      show_metrics: false,
      show_film: true,
      show_academics: false,
    });
    expect(isSectionVisible(s, "values")).toBe(true);
    expect(isSectionVisible(s, "team_history")).toBe(true);
    expect(isSectionVisible(s, "awards")).toBe(true);
    expect(isSectionVisible(s, "academics")).toBe(false);
    expect(isSectionVisible(s, "film")).toBe(true);
    expect(isSectionVisible(s, "metrics")).toBe(false);
  });

  it("overrides a stored section_config's academics/film/metrics from show_* even when config disagrees", () => {
    const stored = [
      { key: "academics", visible: true },
      { key: "film", visible: false },
      { key: "metrics", visible: true },
      { key: "values", visible: true },
      { key: "team_history", visible: false },
      { key: "awards", visible: true },
    ];
    const s = resolveSections({
      section_config: stored,
      show_academics: false,
      show_film: true,
      show_metrics: false,
    });
    expect(isSectionVisible(s, "academics")).toBe(false);
    expect(isSectionVisible(s, "film")).toBe(true);
    expect(isSectionVisible(s, "metrics")).toBe(false);
    // non-legacy keys pass through from stored config untouched
    expect(isSectionVisible(s, "values")).toBe(true);
    expect(isSectionVisible(s, "team_history")).toBe(false);
    expect(isSectionVisible(s, "awards")).toBe(true);
  });

  it("treats null/undefined section_config as empty and backfills", () => {
    const s = resolveSections({ section_config: null });
    expect(s.map((x) => x.key)).toEqual(DEFAULT_SECTION_ORDER);
    expect(isSectionVisible(s, "metrics")).toBe(false);
    expect(isSectionVisible(s, "film")).toBe(false);
    expect(isSectionVisible(s, "academics")).toBe(false);
    expect(isSectionVisible(s, "values")).toBe(true);
  });
});
