import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertGuardianConfirmed,
  hasParentInFamily,
} from "~/server/utils/guardianGate";

const makeSupabase = (
  user: {
    role: string;
    date_of_birth: string | null;
    guardian_consent_at: string | null;
  } | null,
  // No family membership by default — every existing test case here predates the
  // family-override and expects it to be a no-op unless explicitly opted into.
  familyMembership: { family_unit_id: string } | null = null,
  familyHasParent = false,
) => {
  const usersMaybeSingle = vi.fn(async () => ({ data: user }));
  const usersEq = vi.fn(() => ({ maybeSingle: usersMaybeSingle }));
  const usersSelect = vi.fn(() => ({ eq: usersEq }));

  const membershipMaybeSingle = vi.fn(async () => ({ data: familyMembership }));
  const parentMaybeSingle = vi.fn(async () => ({
    data: familyHasParent ? { user_id: "some-parent" } : null,
  }));
  // hasParentInFamily's second query chains .eq().eq().limit().maybeSingle();
  // the first (own membership) query is .eq().maybeSingle() only.
  const familyMembersSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: membershipMaybeSingle,
      eq: vi.fn(() => ({
        limit: vi.fn(() => ({ maybeSingle: parentMaybeSingle })),
      })),
    })),
  }));

  const from = vi.fn((table: string) => {
    if (table === "family_members") return { select: familyMembersSelect };
    return { select: usersSelect };
  });

  return { client: { from } };
};

const yearsAgo = (n: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

describe("assertGuardianConfirmed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a 13-17 player with no guardian consent on file", async () => {
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(15),
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1", "message coaches"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("blocks a player who skipped naming a guardian at signup (no claim ever existed)", async () => {
    // Identical DB state to the pending-claim case from the gate's point of view —
    // this is the regression this task exists to close: pre-fix, a skip left
    // guardian_claims with no row at all, and the old claims-keyed check silently
    // unlocked messaging for exactly this case.
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(14),
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-2"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows a 13-17 player whose guardian has confirmed", async () => {
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(15),
      guardian_consent_at: "2026-09-01T00:00:00.000Z",
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1"),
    ).resolves.toBeUndefined();
  });

  it("allows an adult player regardless of consent", async () => {
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(20),
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "adult-1"),
    ).resolves.toBeUndefined();
  });

  it("allows a parent regardless of consent", async () => {
    const { client } = makeSupabase({
      role: "parent",
      date_of_birth: null,
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "parent-1"),
    ).resolves.toBeUndefined();
  });

  it("fails open (resolves) for a player with a null date_of_birth", async () => {
    // requiresGuardianInvite(null) is false by contract — a row with no DOB must
    // never lock someone out, even though this is also the exact fail-open window
    // signup-minor.post.ts's atomic-metadata fix (see date_of_birth in signUp())
    // exists to prevent ever landing in the DB in the first place.
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: null,
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-null-dob"),
    ).resolves.toBeUndefined();
  });

  it("fails open when the user row can't be found", async () => {
    const { client } = makeSupabase(null);

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "missing-user"),
    ).resolves.toBeUndefined();
  });

  it("names the attempted action in the error", async () => {
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(15),
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1", "share your profile"),
    ).rejects.toMatchObject({
      statusMessage: expect.stringContaining("share your profile"),
    });
  });

  it("allows a locked minor who already belongs to a family unit with a parent", async () => {
    // A minor invited by a parent whose date_of_birth was only added/corrected AFTER
    // the invite was accepted: accept.post.ts's requiresGuardianInvite(dob) check ran
    // against a null DOB at the time, so guardian_consent_at was never stamped — but a
    // real parent already sits in the same family. Without the override this player
    // is permanently locked despite a real guardian being present.
    const { client } = makeSupabase(
      {
        role: "player",
        date_of_birth: yearsAgo(15),
        guardian_consent_at: null,
      },
      { family_unit_id: "family-1" },
      true,
    );

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-with-family-parent"),
    ).resolves.toBeUndefined();
  });

  it("still blocks a locked minor whose family unit has no parent (self-created family)", async () => {
    // Both players and parents can call /api/family/create — a solo player's
    // self-created family has a family_members row but no parent role in it. Family
    // membership alone isn't the signal; a parent within that family is.
    const { client } = makeSupabase(
      {
        role: "player",
        date_of_birth: yearsAgo(15),
        guardian_consent_at: null,
      },
      { family_unit_id: "family-2" },
      false,
    );

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-solo-family"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("hasParentInFamily", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when the player has no family membership at all", async () => {
    const { client } = makeSupabase(null, null, false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(hasParentInFamily(client as any, "solo-player")).resolves.toBe(
      false,
    );
  });

  it("returns true when a sibling family_members row has role 'parent'", async () => {
    const { client } = makeSupabase(null, { family_unit_id: "family-1" }, true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(hasParentInFamily(client as any, "player-1")).resolves.toBe(
      true,
    );
  });

  it("returns false when the family unit has membership but no parent role", async () => {
    const { client } = makeSupabase(
      null,
      { family_unit_id: "family-2" },
      false,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(hasParentInFamily(client as any, "player-2")).resolves.toBe(
      false,
    );
  });
});
