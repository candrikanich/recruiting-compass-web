import { describe, it, expect } from "vitest";
import { buildInboundInteractionRow } from "~/server/utils/inboundInteraction";

const base = {
  coachId: "c1",
  schoolId: "s1",
  familyUnitId: "f1",
  loggedBy: "u1",
  note: "We loved your film",
  program: null,
  occurredAt: "2026-08-27T00:00:00.000Z",
} as const;

describe("buildInboundInteractionRow", () => {
  it("maps a contact lead to an inbound email interaction", () => {
    const row = buildInboundInteractionRow({ ...base, kind: "contact" });
    expect(row).toMatchObject({
      coach_id: "c1",
      school_id: "s1",
      family_unit_id: "f1",
      logged_by: "u1",
      type: "email",
      direction: "inbound",
      occurred_at: base.occurredAt,
      content: "We loved your film",
    });
    expect(row.subject).toContain("public profile");
  });

  it("maps an interest lead to an inbound interest interaction with program in subject", () => {
    const row = buildInboundInteractionRow({
      ...base,
      kind: "interest",
      note: null,
      program: "Pitcher",
    });
    expect(row.type).toBe("interest");
    expect(row.direction).toBe("inbound");
    expect(row.subject).toContain("Pitcher");
  });
});
