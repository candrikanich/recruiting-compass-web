import { describe, it, expect } from "vitest";
import { resolveCalendarKey, NO_SPORT_FALLBACK } from "~/utils/recruitingCalendar/resolver";

describe("resolveCalendarKey", () => {
  it("maps single-calendar sports", () => {
    expect(resolveCalendarKey("Baseball")).toBe("MBA");
    expect(resolveCalendarKey("Softball")).toBe("WSB");
    expect(resolveCalendarKey("Track & Field")).toBe("XCTF");
    expect(resolveCalendarKey("Cross Country")).toBe("XCTF");
    expect(resolveCalendarKey("Volleyball")).toBe("WVB");
  });
  it("resolves gender-split sports", () => {
    expect(resolveCalendarKey("Basketball", { gender: "male" })).toBe("MBB");
    expect(resolveCalendarKey("Basketball", { gender: "female" })).toBe("WBB");
    expect(resolveCalendarKey("Lacrosse", { gender: "female" })).toBe("WLA");
    expect(resolveCalendarKey("Basketball", { gender: null })).toBe("MBB"); // default men's
    expect(resolveCalendarKey("Basketball", { gender: "prefer_not_to_say" })).toBe("MBB");
  });
  it("golf: men→MGO, else Other", () => {
    expect(resolveCalendarKey("Golf", { gender: "male" })).toBe("MGO");
    expect(resolveCalendarKey("Golf", { gender: "female" })).toBe("Other");
  });
  it("golf: defaults to men's (MGO) for null/undefined-opts/other/prefer_not_to_say — locked, do not change", () => {
    expect(resolveCalendarKey("Golf", { gender: null })).toBe("MGO");
    expect(resolveCalendarKey("Golf")).toBe("MGO");
    expect(resolveCalendarKey("Golf", { gender: "other" })).toBe("MGO");
    expect(resolveCalendarKey("Golf", { gender: "prefer_not_to_say" })).toBe("MGO");
    expect(resolveCalendarKey("Golf", { gender: "female" })).toBe("Other");
  });
  it("lacrosse: covers the male and no-opts branches (only WLA/female was previously tested)", () => {
    expect(resolveCalendarKey("Lacrosse", { gender: "male" })).toBe("MLA");
    expect(resolveCalendarKey("Lacrosse")).toBe("MLA");
  });
  it("football subdivision toggle, default FBS", () => {
    expect(resolveCalendarKey("Football")).toBe("FBS");
    expect(resolveCalendarKey("Football", { footballSubdivision: "FCS" })).toBe("FCS");
  });
  it("sports without any published NCAA calendar fall to the generic Other default", () => {
    for (const s of ["Tennis", "Water Polo"] as const) {
      expect(resolveCalendarKey(s)).toBe("Other");
    }
  });
  it("NO_SPORT_FALLBACK (the decoupled neutral-sport default) resolves to Other", () => {
    expect(resolveCalendarKey(NO_SPORT_FALLBACK)).toBe("Other");
  });
  it("Other-bundle sports with enumerated per-sport windows resolve to their sub-key", () => {
    expect(resolveCalendarKey("Swimming")).toBe("OTHER_SWIM");
    expect(resolveCalendarKey("Rowing")).toBe("OTHER_ROWING");
    expect(resolveCalendarKey("Field Hockey")).toBe("OTHER_FIELDHOCKEY");
  });
  it("Soccer: gender-split sub-keys, default men's", () => {
    expect(resolveCalendarKey("Soccer", { gender: "male" })).toBe("OTHER_MSOCCER");
    expect(resolveCalendarKey("Soccer", { gender: "female" })).toBe("OTHER_WSOCCER");
    expect(resolveCalendarKey("Soccer", { gender: null })).toBe("OTHER_MSOCCER");
    expect(resolveCalendarKey("Soccer", { gender: "other" })).toBe("OTHER_MSOCCER");
    expect(resolveCalendarKey("Soccer", { gender: "prefer_not_to_say" })).toBe("OTHER_MSOCCER");
  });
  it("Ice Hockey: gender-split sub-keys, default men's", () => {
    expect(resolveCalendarKey("Ice Hockey", { gender: "male" })).toBe("OTHER_MICEHOCKEY");
    expect(resolveCalendarKey("Ice Hockey", { gender: "female" })).toBe("OTHER_WICEHOCKEY");
    expect(resolveCalendarKey("Ice Hockey", { gender: null })).toBe("OTHER_MICEHOCKEY");
    expect(resolveCalendarKey("Ice Hockey", { gender: "prefer_not_to_say" })).toBe("OTHER_MICEHOCKEY");
  });
  it("Wrestling: gender-split sub-keys, default men's", () => {
    expect(resolveCalendarKey("Wrestling", { gender: "male" })).toBe("OTHER_MWRESTLING");
    expect(resolveCalendarKey("Wrestling", { gender: "female" })).toBe("OTHER_WWRESTLING");
    expect(resolveCalendarKey("Wrestling", { gender: null })).toBe("OTHER_MWRESTLING");
    expect(resolveCalendarKey("Wrestling", { gender: "other" })).toBe("OTHER_MWRESTLING");
    expect(resolveCalendarKey("Wrestling", { gender: "prefer_not_to_say" })).toBe("OTHER_MWRESTLING");
  });
});
