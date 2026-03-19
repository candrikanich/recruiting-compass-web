import { describe, it, expect } from "vitest";
import {
  getParentMessage,
  getParentActionItems,
  getRecruitingExpectations,
} from "~/utils/parentMessaging";

describe("getParentMessage", () => {
  it("returns freshman message for freshman phase", () => {
    const result = getParentMessage({ phase: "freshman" });
    expect(result).toContain("Freshman year is about foundation");
  });

  it("returns sophomore message for sophomore phase", () => {
    const result = getParentMessage({ phase: "sophomore" });
    expect(result).toContain("Sophomore year is when many coaches start");
  });

  it("returns at_risk junior message when phase=junior and status=at_risk", () => {
    const result = getParentMessage({ phase: "junior", status: "at_risk" });
    expect(result).toContain("Junior year is crucial for recruiting");
  });

  it("returns slightly_behind junior message when phase=junior and status=slightly_behind", () => {
    const result = getParentMessage({
      phase: "junior",
      status: "slightly_behind",
    });
    expect(result).toContain("Junior year is when serious recruiting happens");
  });

  it("returns generic junior message when phase=junior and status=on_track", () => {
    const result = getParentMessage({ phase: "junior", status: "on_track" });
    expect(result).toContain("Junior year is peak recruiting season");
  });

  it("returns generic junior message when phase=junior with no status", () => {
    const result = getParentMessage({ phase: "junior" });
    expect(result).toContain("Junior year is peak recruiting season");
  });

  it("returns at_risk senior message when phase=senior and status=at_risk", () => {
    const result = getParentMessage({ phase: "senior", status: "at_risk" });
    expect(result).toContain("Senior year is the final stretch");
  });

  it("returns generic senior message when phase=senior without at_risk status", () => {
    const result = getParentMessage({ phase: "senior", status: "on_track" });
    expect(result).toContain("Senior year is decision time");
  });

  it("returns generic senior message when phase=senior with no status", () => {
    const result = getParentMessage({ phase: "senior" });
    expect(result).toContain("Senior year is decision time");
  });

  it("returns long-phase message when daysInPhase > 200 and no matching phase/status", () => {
    const result = getParentMessage({ daysInPhase: 201 });
    expect(result).toContain("working on this phase for a while");
  });

  it("does NOT return long-phase message when daysInPhase is exactly 200", () => {
    const result = getParentMessage({ daysInPhase: 200 });
    // daysInPhase > 200 is required, so exactly 200 falls through to null
    expect(result).toBeNull();
  });

  it("returns on_track status message when no phase but status=on_track", () => {
    const result = getParentMessage({ status: "on_track" });
    expect(result).toContain("Your athlete is on track");
  });

  it("returns slightly_behind status message when no phase but status=slightly_behind", () => {
    const result = getParentMessage({ status: "slightly_behind" });
    expect(result).toContain("slightly behind where they'd like to be");
  });

  it("returns at_risk status message when no phase but status=at_risk", () => {
    const result = getParentMessage({ status: "at_risk" });
    expect(result).toContain("adjust their recruiting strategy");
  });

  it("returns null for committed phase with no matching status", () => {
    const result = getParentMessage({ phase: "committed" });
    expect(result).toBeNull();
  });

  it("returns null for empty context object", () => {
    const result = getParentMessage({});
    expect(result).toBeNull();
  });

  it("returns null when all values are undefined", () => {
    const result = getParentMessage({
      phase: undefined,
      status: undefined,
      daysInPhase: undefined,
    });
    expect(result).toBeNull();
  });
});

describe("getParentActionItems", () => {
  it("includes division action when no division provided", () => {
    const actions = getParentActionItems({});
    expect(actions).toContain(
      "Help your athlete identify target divisions (D1, D2, D3, NAIA, JUCO)",
    );
  });

  it("does NOT include division action when division is provided", () => {
    const actions = getParentActionItems({ division: "DI" });
    const divisionAction = actions.find((a) => a.includes("target divisions"));
    expect(divisionAction).toBeUndefined();
  });

  it("includes school list action when schoolCount is undefined", () => {
    const actions = getParentActionItems({});
    expect(actions).toContain(
      "Build a list of 15-20 target schools at appropriate competitive levels",
    );
  });

  it("includes school list action when schoolCount < 10", () => {
    const actions = getParentActionItems({ schoolCount: 5 });
    expect(actions).toContain(
      "Build a list of 15-20 target schools at appropriate competitive levels",
    );
  });

  it("does NOT include school list action when schoolCount >= 10", () => {
    const actions = getParentActionItems({ schoolCount: 10 });
    const schoolAction = actions.find((a) => a.includes("Build a list"));
    expect(schoolAction).toBeUndefined();
  });

  it("includes coach outreach action when coachInteractionCount is undefined", () => {
    const actions = getParentActionItems({});
    expect(actions).toContain(
      "Encourage reaching out to coaches at target schools",
    );
  });

  it("includes coach outreach action when coachInteractionCount < 5", () => {
    const actions = getParentActionItems({ coachInteractionCount: 3 });
    expect(actions).toContain(
      "Encourage reaching out to coaches at target schools",
    );
  });

  it("does NOT include coach outreach action when coachInteractionCount >= 5", () => {
    const actions = getParentActionItems({ coachInteractionCount: 5 });
    const coachAction = actions.find((a) =>
      a.includes("Encourage reaching out"),
    );
    expect(coachAction).toBeUndefined();
  });

  it("includes training focus action for freshman phase", () => {
    const actions = getParentActionItems({ phase: "freshman" });
    expect(actions).toContain(
      "Focus on training and academics now—recruiting will intensify later",
    );
  });

  it("includes training focus action for sophomore phase", () => {
    const actions = getParentActionItems({ phase: "sophomore" });
    expect(actions).toContain(
      "Focus on training and academics now—recruiting will intensify later",
    );
  });

  it("does NOT include training focus action for junior phase", () => {
    const actions = getParentActionItems({
      phase: "junior",
      status: "on_track",
    });
    const trainingAction = actions.find((a) =>
      a.includes("Focus on training"),
    );
    expect(trainingAction).toBeUndefined();
  });

  it("includes showcase action for junior phase when status is not on_track", () => {
    const actions = getParentActionItems({
      phase: "junior",
      status: "at_risk",
    });
    expect(actions).toContain(
      "Attend summer showcases and camps to increase visibility",
    );
  });

  it("does NOT include showcase action for junior phase when status is on_track", () => {
    const actions = getParentActionItems({
      phase: "junior",
      status: "on_track",
    });
    const showcaseAction = actions.find((a) =>
      a.includes("Attend summer showcases"),
    );
    expect(showcaseAction).toBeUndefined();
  });

  it("includes expand target school action for senior phase when status=at_risk", () => {
    const actions = getParentActionItems({
      phase: "senior",
      status: "at_risk",
    });
    expect(actions).toContain(
      "Expand target school list to include D2, D3, NAIA, and JUCO options",
    );
  });

  it("does NOT include expand school action for senior when status is not at_risk", () => {
    const actions = getParentActionItems({
      phase: "senior",
      status: "on_track",
    });
    const expandAction = actions.find((a) =>
      a.includes("Expand target school list"),
    );
    expect(expandAction).toBeUndefined();
  });

  it("returns empty array when all conditions are satisfied", () => {
    const actions = getParentActionItems({
      division: "DI",
      schoolCount: 15,
      coachInteractionCount: 10,
      phase: "senior",
      status: "on_track",
    });
    expect(actions).toHaveLength(0);
  });
});

describe("getRecruitingExpectations", () => {
  const phases = [
    "freshman",
    "sophomore",
    "junior",
    "senior",
    "committed",
  ] as const;

  it.each(phases)(
    "returns a string for phase=%s with division=DI",
    (phase) => {
      const result = getRecruitingExpectations(phase, "DI");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    },
  );

  it.each(["DI", "DII", "DIII", "NAIA", "JUCO", "ALL"] as const)(
    "returns correct string for junior phase with division=%s",
    (division) => {
      const result = getRecruitingExpectations("junior", division);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    },
  );

  it("returns default string when division is undefined", () => {
    const result = getRecruitingExpectations("senior", undefined);
    expect(result).toContain("Senior year is final decision year");
  });

  it("returns DI-specific string for freshman + DI", () => {
    const result = getRecruitingExpectations("freshman", "DI");
    expect(result).toContain("Few DI programs recruit heavily at freshman");
  });

  it("returns committed + DIII message", () => {
    const result = getRecruitingExpectations("committed", "DIII");
    expect(result).toContain("Your athlete is committed. Great achievement!");
  });

  it("returns default when division is not in record (falls back to default key)", () => {
    const result = getRecruitingExpectations("sophomore", undefined);
    expect(result).toContain(
      "Sophomore year is when coaches start noticing. Increase visibility.",
    );
  });
});
