import { describe, it, expect } from "vitest";
import { heroBackgroundClass } from "~/utils/profile/headerColor";

describe("heroBackgroundClass", () => {
  it("maps each header_color enum value to a dark background class", () => {
    for (const color of [
      "slate",
      "blue",
      "emerald",
      "indigo",
      "teal",
      "rose",
      "violet",
      "amber",
    ]) {
      expect(heroBackgroundClass(color)).toMatch(/^bg-/);
    }
  });

  it("falls back to the slate default for unknown / nullish values", () => {
    expect(heroBackgroundClass("chartreuse")).toBe("bg-brand-slate-900");
    expect(heroBackgroundClass(null)).toBe("bg-brand-slate-900");
    expect(heroBackgroundClass(undefined)).toBe("bg-brand-slate-900");
  });

  it("distinguishes a non-default choice from the default", () => {
    expect(heroBackgroundClass("rose")).toBe("bg-rose-900");
    expect(heroBackgroundClass("blue")).toBe("bg-brand-blue-900");
  });
});
