import { describe, it, expect } from "vitest";
import {
  deriveMissingInfoFields,
  type MissingInfoInput,
} from "~/utils/communication/missingInfo";

const base: MissingInfoInput = {
  referencedKeys: [],
  values: {},
  authoredKeys: new Set(),
  labels: {},
  body: "",
  questionnaireComplete: false,
  hasMetric: true,
  canEditProfile: true,
};

describe("deriveMissingInfoFields", () => {
  it("returns [] when the template needs nothing", () => {
    expect(deriveMissingInfoFields(base)).toEqual([]);
  });

  it("adds a questionnaire boolean row when the body uses the note and it's incomplete", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      body: "Hi {{questionnaireNote}}",
    });
    expect(rows.map((r) => r.id)).toEqual(["questionnaireNote"]);
    expect(rows[0].editor).toEqual({ kind: "boolean" });
  });

  it("omits the questionnaire row once complete", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      body: "Hi {{questionnaireNote}}",
      questionnaireComplete: true,
    });
    expect(rows).toEqual([]);
  });

  it("prompts intendedMajor when referenced and unresolved", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      referencedKeys: ["intendedMajor"],
      authoredKeys: new Set(),
    });
    expect(rows.map((r) => r.id)).toContain("intendedMajor");
  });

  it("programNote and fitReason always have static editableByParent: false", () => {
    const input = {
      ...base,
      referencedKeys: ["programNote", "fitReason"],
      authoredKeys: new Set(["programNote", "fitReason"]),
    };
    const athlete = deriveMissingInfoFields({ ...input, canEditProfile: true });
    const parent = deriveMissingInfoFields({ ...input, canEditProfile: false });

    // Assert athlete case (canEditProfile: true)
    const athleteProgramNote = athlete.find((r) => r.id === "programNote")!;
    const athleteFitReason = athlete.find((r) => r.id === "fitReason")!;
    expect(athleteProgramNote.editableByParent).toBe(false);
    expect(athleteFitReason.editableByParent).toBe(false);

    // Assert parent case (canEditProfile: false) — flags must be identical (static)
    const parentProgramNote = parent.find((r) => r.id === "programNote")!;
    const parentFitReason = parent.find((r) => r.id === "fitReason")!;
    expect(parentProgramNote.editableByParent).toBe(false);
    expect(parentFitReason.editableByParent).toBe(false);
  });

  it("orders fixed: questionnaire, intendedMajor, programNote, fitReason, other, metric", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      body: "{{questionnaireNote}}",
      referencedKeys: [
        "updateHook",
        "intendedMajor",
        "fitReason",
        "programNote",
        "metrics",
      ],
      authoredKeys: new Set(["updateHook", "programNote", "fitReason"]),
      labels: { updateHook: "Recent update" },
      hasMetric: false,
    });
    expect(rows.map((r) => r.id)).toEqual([
      "questionnaireNote",
      "intendedMajor",
      "programNote",
      "fitReason",
      "updateHook",
      "metrics",
    ]);
  });

  it("adds a metric row only when a metric var is used and none exist", () => {
    const used = deriveMissingInfoFields({
      ...base,
      referencedKeys: ["metrics"],
      hasMetric: false,
    });
    expect(used.map((r) => r.id)).toEqual(["metrics"]);
    expect(used[0].editor).toEqual({ kind: "metricLink" });
    const has = deriveMissingInfoFields({
      ...base,
      referencedKeys: ["metrics"],
      hasMetric: true,
    });
    expect(has).toEqual([]);
  });

  it("adds a profileLink row for an unresolved non-authored profile var", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      referencedKeys: ["hsCoachName"],
      authoredKeys: new Set(),
      labels: { hsCoachName: "HS coach" },
    });
    expect(rows.map((r) => r.id)).toEqual(["hsCoachName"]);
    expect(rows[0].editor).toEqual({ kind: "profileLink" });
  });
});
