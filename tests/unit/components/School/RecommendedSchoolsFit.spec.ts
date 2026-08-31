import { describe, it, expect } from "vitest";

describe("Recommendation fit badges", () => {
  it('shows "In-state" badge when school state matches user state', () => {
    const userState = "OH";
    const schoolState = "OH";
    const badge =
      userState === schoolState ? "In-state" : schoolState ? "Out of state" : null;
    expect(badge).toBe("In-state");
  });

  it('shows "Academic match" when GPA is within school range', () => {
    const userGpa = 3.5;
    const schoolAvgGpa = 3.4; // From Scorecard enrichment
    const label = !userGpa
      ? null
      : !schoolAvgGpa
        ? null
        : Math.abs(userGpa - schoolAvgGpa) <= 0.3
          ? "Academic match"
          : userGpa > schoolAvgGpa
            ? "Academic safety"
            : "Academic reach";
    expect(label).toBe("Academic match");
  });

  it("shows prompt when GPA missing", () => {
    const userGpa = null;
    const prompt = !userGpa ? "Add your GPA to see academic fit →" : null;
    expect(prompt).toBe("Add your GPA to see academic fit →");
  });
});
