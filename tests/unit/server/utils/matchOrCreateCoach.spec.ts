import { describe, it, expect, vi } from "vitest";
import { matchOrCreateCoach } from "~/server/utils/matchOrCreateCoach";

/**
 * Minimal per-table chainable stub matching the repo's mutable-mockState idiom
 * (mutable call-capture record, chainable .eq()/.ilike()/.order()/.limit(), terminal
 * .maybeSingle()/.single()). See resolveAthleteId.spec.ts for the precedent.
 */
function makeCoachesTable(opts: {
  matchRow: { id: string } | null;
  insertRow: { id: string } | null;
  calls: { select: Array<[string, string]>; insertPayload: unknown };
}) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn((col: string, val: string) => {
        opts.calls.select.push([col, val]);
        return {
          ilike: vi.fn((col2: string, val2: string) => {
            opts.calls.select.push([col2, val2]);
            return {
              maybeSingle: () =>
                Promise.resolve({ data: opts.matchRow, error: null }),
            };
          }),
        };
      }),
    })),
    insert: vi.fn((payload: unknown) => {
      opts.calls.insertPayload = payload;
      return {
        select: () => ({
          single: () => Promise.resolve({ data: opts.insertRow, error: null }),
        }),
      };
    }),
  };
}

function makeFamilyUnitsTable(row: { created_by_user_id: string | null } | null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: () => Promise.resolve({ data: row, error: null }),
      })),
    })),
  };
}

function makeFamilyMembersTable(row: { user_id: string } | null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: () => Promise.resolve({ data: row, error: null }),
          })),
        })),
      })),
    })),
  };
}

interface AdminMockOpts {
  matchRow?: { id: string } | null;
  insertRow?: { id: string } | null;
  familyUnitRow?: { created_by_user_id: string | null } | null;
  familyMemberRow?: { user_id: string } | null;
}

function makeAdmin(opts: AdminMockOpts = {}) {
  const calls = { select: [] as Array<[string, string]>, insertPayload: undefined as unknown };
  const coachesTable = makeCoachesTable({
    matchRow: opts.matchRow ?? null,
    insertRow: opts.insertRow ?? { id: "new-coach-id" },
    calls,
  });
  const familyUnitsTable = makeFamilyUnitsTable(
    opts.familyUnitRow === undefined ? { created_by_user_id: "owner-1" } : opts.familyUnitRow,
  );
  const familyMembersTable = makeFamilyMembersTable(
    opts.familyMemberRow === undefined ? { user_id: "member-1" } : opts.familyMemberRow,
  );

  const from = vi.fn((table: string) => {
    if (table === "coaches") return coachesTable;
    if (table === "family_units") return familyUnitsTable;
    if (table === "family_members") return familyMembersTable;
    throw new Error(`unexpected table: ${table}`);
  });

  return { from, calls, coachesTable } as never;
}

describe("matchOrCreateCoach", () => {
  it("matches an existing coach by email case-insensitively and does not insert", async () => {
    const admin = makeAdmin({ matchRow: { id: "existing-coach-id" } });

    const result = await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Mike Smith",
      email: "coach@x.com", // stored as "Coach@x.com" — match asserted via mock returning a row
    });

    expect(result).toEqual({ coachId: "existing-coach-id", created: false });
    expect((admin as unknown as { coachesTable: { insert: ReturnType<typeof vi.fn> } }).coachesTable.insert).not.toHaveBeenCalled();
  });

  it("scopes the email match to the given family_unit_id", async () => {
    const admin = makeAdmin({ matchRow: { id: "existing-coach-id" } });

    await matchOrCreateCoach(admin, {
      familyUnitId: "fam-42",
      name: "Mike Smith",
      email: "coach@x.com",
    });

    const calls = (admin as unknown as { calls: { select: Array<[string, string]> } }).calls;
    expect(calls.select).toContainEqual(["family_unit_id", "fam-42"]);
  });

  it("creates a new coach when the email has no match, deriving owner from family_units", async () => {
    const admin = makeAdmin({ matchRow: null, insertRow: { id: "new-coach-id" } });

    const result = await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Mike Smith",
      email: "new-coach@example.com",
      schoolId: "school-1",
    });

    expect(result).toEqual({ coachId: "new-coach-id", created: true });
    const insertPayload = (admin as unknown as { calls: { insertPayload: Record<string, unknown> } })
      .calls.insertPayload;
    expect(insertPayload).toMatchObject({
      family_unit_id: "fam-1",
      first_name: "Mike",
      last_name: "Smith",
      email: "new-coach@example.com",
      school_id: "school-1",
      user_id: "owner-1",
      role: "recruiting",
    });
  });

  it("always creates (never queries for a match) when no email is given", async () => {
    const admin = makeAdmin({ insertRow: { id: "new-coach-id" } });

    const result = await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Cher",
      schoolId: "school-1",
    });

    expect(result).toEqual({ coachId: "new-coach-id", created: true });
    expect(
      (admin as unknown as { coachesTable: { select: ReturnType<typeof vi.fn> } }).coachesTable.select,
    ).not.toHaveBeenCalled();
  });

  it("splits a single-token name into first name only", async () => {
    const admin = makeAdmin({ insertRow: { id: "new-coach-id" } });

    await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Cher",
      schoolId: "school-1",
    });

    const insertPayload = (admin as unknown as { calls: { insertPayload: Record<string, unknown> } })
      .calls.insertPayload;
    expect(insertPayload).toMatchObject({ first_name: "Cher", last_name: "" });
  });

  it("splits a multi-token name using the last token as the last name", async () => {
    const admin = makeAdmin({ insertRow: { id: "new-coach-id" } });

    await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Mary Jane Watson",
      schoolId: "school-1",
    });

    const insertPayload = (admin as unknown as { calls: { insertPayload: Record<string, unknown> } })
      .calls.insertPayload;
    expect(insertPayload).toMatchObject({ first_name: "Mary Jane", last_name: "Watson" });
  });

  it("maps a head-coach title to the head role", async () => {
    const admin = makeAdmin({ insertRow: { id: "new-coach-id" } });

    await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Mike Smith",
      title: "Head Baseball Coach",
      schoolId: "school-1",
    });

    const insertPayload = (admin as unknown as { calls: { insertPayload: Record<string, unknown> } })
      .calls.insertPayload;
    expect(insertPayload).toMatchObject({ role: "head" });
  });

  it("maps an assistant-coach title to the assistant role", async () => {
    const admin = makeAdmin({ insertRow: { id: "new-coach-id" } });

    await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Mike Smith",
      title: "Assistant Coach",
      schoolId: "school-1",
    });

    const insertPayload = (admin as unknown as { calls: { insertPayload: Record<string, unknown> } })
      .calls.insertPayload;
    expect(insertPayload).toMatchObject({ role: "assistant" });
  });

  it("defaults to the recruiting role when the title does not map", async () => {
    const admin = makeAdmin({ insertRow: { id: "new-coach-id" } });

    await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Mike Smith",
      title: "Recruiting Coordinator",
      schoolId: "school-1",
    });

    const insertPayload = (admin as unknown as { calls: { insertPayload: Record<string, unknown> } })
      .calls.insertPayload;
    expect(insertPayload).toMatchObject({ role: "recruiting" });
  });

  it("falls back to a family_members row when family_units has no created_by_user_id", async () => {
    const admin = makeAdmin({
      insertRow: { id: "new-coach-id" },
      familyUnitRow: { created_by_user_id: null },
      familyMemberRow: { user_id: "member-9" },
    });

    await matchOrCreateCoach(admin, {
      familyUnitId: "fam-1",
      name: "Mike Smith",
      schoolId: "school-1",
    });

    const insertPayload = (admin as unknown as { calls: { insertPayload: Record<string, unknown> } })
      .calls.insertPayload;
    expect(insertPayload).toMatchObject({ user_id: "member-9" });
  });

  it("throws when no schoolId is provided on the create path (coaches.school_id is NOT NULL)", async () => {
    const admin = makeAdmin({ insertRow: { id: "new-coach-id" } });

    await expect(
      matchOrCreateCoach(admin, { familyUnitId: "fam-1", name: "Mike Smith" }),
    ).rejects.toThrow(/school/i);
  });

  it("throws when no owning user can be resolved for the family", async () => {
    const admin = makeAdmin({
      familyUnitRow: { created_by_user_id: null },
      familyMemberRow: null,
    });

    await expect(
      matchOrCreateCoach(admin, {
        familyUnitId: "fam-1",
        name: "Mike Smith",
        schoolId: "school-1",
      }),
    ).rejects.toThrow(/family/i);
  });
});
