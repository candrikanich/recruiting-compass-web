import { describe, it, expect, vi } from "vitest";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";

/**
 * Minimal chainable coaches-table stub matching the repo's mutable-mockState
 * idiom (mutable call-capture record, chainable .eq()/.ilike(), terminal
 * .maybeSingle()). See resolveAthleteId.spec.ts for the precedent.
 */
function makeAdmin(matchRow: { id: string } | null) {
  const calls = { select: [] as Array<[string, string]> };
  const eq = vi.fn((col: string, val: string) => {
    calls.select.push([col, val]);
    return {
      ilike: vi.fn((col2: string, val2: string) => {
        calls.select.push([col2, val2]);
        return { maybeSingle: () => Promise.resolve({ data: matchRow, error: null }) };
      }),
    };
  });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table !== "coaches") throw new Error(`unexpected table: ${table}`);
    return { select };
  });

  return { from, calls, select } as never;
}

describe("matchCoachByEmail", () => {
  it("returns the coach id on a case-insensitive email match", async () => {
    const admin = makeAdmin({ id: "existing-coach-id" });

    const result = await matchCoachByEmail(admin, {
      familyUnitId: "fam-1",
      email: "coach@x.com", // stored as "Coach@x.com" — match asserted via mock returning a row
    });

    expect(result).toEqual({ coachId: "existing-coach-id" });
  });

  it("returns null coachId when no coach matches", async () => {
    const admin = makeAdmin(null);

    const result = await matchCoachByEmail(admin, {
      familyUnitId: "fam-1",
      email: "unknown@example.com",
    });

    expect(result).toEqual({ coachId: null });
  });

  it("returns null coachId without querying when no email is given", async () => {
    const admin = makeAdmin({ id: "should-not-be-returned" });

    const result = await matchCoachByEmail(admin, { familyUnitId: "fam-1" });

    expect(result).toEqual({ coachId: null });
    expect((admin as unknown as { select: ReturnType<typeof vi.fn> }).select).not.toHaveBeenCalled();
  });

  it("returns null coachId for an empty-string email without querying", async () => {
    const admin = makeAdmin({ id: "should-not-be-returned" });

    const result = await matchCoachByEmail(admin, { familyUnitId: "fam-1", email: "  " });

    expect(result).toEqual({ coachId: null });
    expect((admin as unknown as { select: ReturnType<typeof vi.fn> }).select).not.toHaveBeenCalled();
  });

  it("scopes the match to the given family_unit_id", async () => {
    const admin = makeAdmin({ id: "existing-coach-id" });

    await matchCoachByEmail(admin, { familyUnitId: "fam-42", email: "coach@x.com" });

    const calls = (admin as unknown as { calls: { select: Array<[string, string]> } }).calls;
    expect(calls.select).toContainEqual(["family_unit_id", "fam-42"]);
  });
});
