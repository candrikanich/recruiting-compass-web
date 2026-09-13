import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertGuardianConfirmed } from "~/server/utils/guardianGate";

const makeSupabase = (
  user: {
    role: string;
    date_of_birth: string | null;
    guardian_consent_at: string | null;
  } | null,
) => {
  const maybeSingle = vi.fn(async () => ({ data: user }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return {
    client: { from: vi.fn(() => ({ select })) },
  };
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
});
