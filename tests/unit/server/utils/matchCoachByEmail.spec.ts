import { describe, it, expect } from "vitest";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";

function fakeAdmin(row: { id: string; school_id: string } | null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    ilike: () => builder,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return { from: () => builder } as never;
}

describe("matchCoachByEmail", () => {
  it("returns coachId and schoolId when a coach matches", async () => {
    const res = await matchCoachByEmail(fakeAdmin({ id: "c1", school_id: "s1" }), {
      familyUnitId: "f1",
      email: "coach@school.edu",
    });
    expect(res).toEqual({ coachId: "c1", schoolId: "s1" });
  });

  it("returns nulls when no email is supplied", async () => {
    const res = await matchCoachByEmail(fakeAdmin(null), { familyUnitId: "f1" });
    expect(res).toEqual({ coachId: null, schoolId: null });
  });
});
