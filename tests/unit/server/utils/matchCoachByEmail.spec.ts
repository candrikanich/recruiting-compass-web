import { describe, it, expect, vi } from "vitest";
import {
  matchCoachByEmail,
  extractDomain,
  autoCreateCoachByEmailDomain,
} from "~/server/utils/matchCoachByEmail";

/**
 * Minimal chainable coaches-table stub matching the repo's mutable-mockState
 * idiom (mutable call-capture record, chainable .eq()/.ilike(), terminal
 * .maybeSingle()). See resolveAthleteId.spec.ts for the precedent.
 */
function makeAdmin(matchRow: { id: string; school_id: string } | null) {
  const calls = { select: [] as Array<[string, string]> };
  const eq = vi.fn((col: string, val: string) => {
    calls.select.push([col, val]);
    return {
      ilike: vi.fn((col2: string, val2: string) => {
        calls.select.push([col2, val2]);
        return {
          maybeSingle: () => Promise.resolve({ data: matchRow, error: null }),
        };
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
  it("returns the coach id and school_id on a case-insensitive email match", async () => {
    const admin = makeAdmin({ id: "existing-coach-id", school_id: "s1" });

    const result = await matchCoachByEmail(admin, {
      familyUnitId: "fam-1",
      email: "coach@x.com", // stored as "Coach@x.com" — match asserted via mock returning a row
    });

    expect(result).toEqual({ coachId: "existing-coach-id", schoolId: "s1" });
  });

  it("returns null coachId and schoolId when no coach matches", async () => {
    const admin = makeAdmin(null);

    const result = await matchCoachByEmail(admin, {
      familyUnitId: "fam-1",
      email: "unknown@example.com",
    });

    expect(result).toEqual({ coachId: null, schoolId: null });
  });

  it("returns null coachId and schoolId without querying when no email is given", async () => {
    const admin = makeAdmin({
      id: "should-not-be-returned",
      school_id: "should-not-be-returned",
    });

    const result = await matchCoachByEmail(admin, { familyUnitId: "fam-1" });

    expect(result).toEqual({ coachId: null, schoolId: null });
    expect(
      (admin as unknown as { select: ReturnType<typeof vi.fn> }).select,
    ).not.toHaveBeenCalled();
  });

  it("returns null coachId and schoolId for an empty-string email without querying", async () => {
    const admin = makeAdmin({
      id: "should-not-be-returned",
      school_id: "should-not-be-returned",
    });

    const result = await matchCoachByEmail(admin, {
      familyUnitId: "fam-1",
      email: "  ",
    });

    expect(result).toEqual({ coachId: null, schoolId: null });
    expect(
      (admin as unknown as { select: ReturnType<typeof vi.fn> }).select,
    ).not.toHaveBeenCalled();
  });

  it("scopes the match to the given family_unit_id", async () => {
    const admin = makeAdmin({ id: "existing-coach-id", school_id: "s1" });

    await matchCoachByEmail(admin, {
      familyUnitId: "fam-42",
      email: "coach@x.com",
    });

    const calls = (
      admin as unknown as { calls: { select: Array<[string, string]> } }
    ).calls;
    expect(calls.select).toContainEqual(["family_unit_id", "fam-42"]);
  });
});

describe("extractDomain", () => {
  it("extracts the bare hostname from a full URL with a path", () => {
    expect(extractDomain("https://www.osu.edu/athletics")).toBe("osu.edu");
  });

  it("extracts the hostname from a bare domain with no protocol", () => {
    expect(extractDomain("osu.edu")).toBe("osu.edu");
  });

  it("strips a leading www. with no path present", () => {
    expect(extractDomain("https://www.osu.edu")).toBe("osu.edu");
  });

  it("returns null for a missing or empty value", () => {
    expect(extractDomain(null)).toBeNull();
    expect(extractDomain(undefined)).toBeNull();
    expect(extractDomain("")).toBeNull();
    expect(extractDomain("   ")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(extractDomain("http://")).toBeNull();
  });
});

/**
 * Chainable schools/coaches stub for autoCreateCoachByEmailDomain: schools
 * resolves a fixed row set via .select().eq(), coaches captures the insert
 * payload and resolves the given row (or an error) via .insert().select().single().
 */
function makeAutoCreateAdmin(options: {
  schools: Array<{ id: string; user_id: string; website: string | null }>;
  insertedCoach?: { id: string } | null;
}) {
  const insertCalls: Array<Record<string, unknown>> = [];
  const from = vi.fn((table: string) => {
    if (table === "schools") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: options.schools, error: null })),
        })),
      };
    }
    if (table === "coaches") {
      return {
        insert: vi.fn((row: Record<string, unknown>) => {
          insertCalls.push(row);
          return {
            select: () => ({
              single: () =>
                Promise.resolve(
                  options.insertedCoach
                    ? { data: options.insertedCoach, error: null }
                    : { data: null, error: { message: "insert failed" } },
                ),
            }),
          };
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  return { admin: { from } as never, from, insertCalls };
}

describe("autoCreateCoachByEmailDomain", () => {
  it("inserts a new coach when the sender domain uniquely matches a tracked school", async () => {
    const { admin, insertCalls } = makeAutoCreateAdmin({
      schools: [{ id: "school-1", user_id: "user-1", website: "https://www.osu.edu/athletics" }],
      insertedCoach: { id: "auto-coach-1" },
    });

    const result = await autoCreateCoachByEmailDomain(admin, {
      familyUnitId: "fam-1",
      senderEmail: "smith@osu.edu",
      senderName: "Coach Smith",
    });

    expect(result).toEqual({ coachId: "auto-coach-1", schoolId: "school-1" });
    expect(insertCalls).toEqual([
      {
        family_unit_id: "fam-1",
        school_id: "school-1",
        user_id: "user-1",
        first_name: "Coach",
        last_name: "Smith",
        email: "smith@osu.edu",
        role: "recruiting",
        source: "inbound_email_auto",
      },
    ]);
  });

  it("falls back to a placeholder first name + email local-part when senderName is null", async () => {
    const { admin, insertCalls } = makeAutoCreateAdmin({
      schools: [{ id: "school-1", user_id: "user-1", website: "osu.edu" }],
      insertedCoach: { id: "auto-coach-1" },
    });

    await autoCreateCoachByEmailDomain(admin, {
      familyUnitId: "fam-1",
      senderEmail: "jsmith@osu.edu",
      senderName: null,
    });

    expect(insertCalls[0]).toMatchObject({ first_name: "Coach", last_name: "jsmith" });
  });

  it("never inserts an empty-string last_name for a single-token sender name", async () => {
    const { admin, insertCalls } = makeAutoCreateAdmin({
      schools: [{ id: "school-1", user_id: "user-1", website: "osu.edu" }],
      insertedCoach: { id: "auto-coach-1" },
    });

    await autoCreateCoachByEmailDomain(admin, {
      familyUnitId: "fam-1",
      senderEmail: "coach@osu.edu",
      senderName: "Buckeyes",
    });

    expect(insertCalls[0]).toMatchObject({ first_name: "Buckeyes", last_name: "Coach" });
  });

  it("does not auto-create for a personal-email-provider domain", async () => {
    const { admin, from, insertCalls } = makeAutoCreateAdmin({
      schools: [{ id: "school-1", user_id: "user-1", website: "https://www.gmail.com" }],
    });

    const result = await autoCreateCoachByEmailDomain(admin, {
      familyUnitId: "fam-1",
      senderEmail: "smith@gmail.com",
      senderName: "Coach Smith",
    });

    expect(result).toEqual({ coachId: null, schoolId: null });
    expect(from).not.toHaveBeenCalled();
    expect(insertCalls).toEqual([]);
  });

  it("does not auto-create when the domain matches more than one tracked school", async () => {
    const { admin, insertCalls } = makeAutoCreateAdmin({
      schools: [
        { id: "school-1", user_id: "user-1", website: "https://osu.edu" },
        { id: "school-2", user_id: "user-2", website: "https://www.osu.edu/football" },
      ],
    });

    const result = await autoCreateCoachByEmailDomain(admin, {
      familyUnitId: "fam-1",
      senderEmail: "smith@osu.edu",
      senderName: "Coach Smith",
    });

    expect(result).toEqual({ coachId: null, schoolId: null });
    expect(insertCalls).toEqual([]);
  });

  it("does not auto-create when the domain matches zero tracked schools", async () => {
    const { admin, insertCalls } = makeAutoCreateAdmin({
      schools: [{ id: "school-1", user_id: "user-1", website: "https://michigan.edu" }],
    });

    const result = await autoCreateCoachByEmailDomain(admin, {
      familyUnitId: "fam-1",
      senderEmail: "smith@osu.edu",
      senderName: "Coach Smith",
    });

    expect(result).toEqual({ coachId: null, schoolId: null });
    expect(insertCalls).toEqual([]);
  });

  it("returns null coachId/schoolId without querying when no sender email is given", async () => {
    const { admin, from } = makeAutoCreateAdmin({ schools: [] });

    const result = await autoCreateCoachByEmailDomain(admin, {
      familyUnitId: "fam-1",
      senderEmail: null,
      senderName: "Coach Smith",
    });

    expect(result).toEqual({ coachId: null, schoolId: null });
    expect(from).not.toHaveBeenCalled();
  });
});
