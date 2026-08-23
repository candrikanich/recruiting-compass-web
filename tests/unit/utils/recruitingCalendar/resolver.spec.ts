import { describe, it, expect } from "vitest";
import { resolveCalendarKey } from "~/utils/recruitingCalendar/resolver";

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
  it("football subdivision toggle, default FBS", () => {
    expect(resolveCalendarKey("Football")).toBe("FBS");
    expect(resolveCalendarKey("Football", { footballSubdivision: "FCS" })).toBe("FCS");
  });
  it("no-calendar sports fall to Other", () => {
    for (const s of ["Soccer", "Swimming", "Tennis", "Wrestling", "Ice Hockey", "Field Hockey", "Rowing", "Water Polo"] as const) {
      expect(resolveCalendarKey(s)).toBe("Other");
    }
  });
});
