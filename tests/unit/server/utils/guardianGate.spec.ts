import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertGuardianConfirmed } from "~/server/utils/guardianGate";

const makeSupabase = (claim: { status: string } | null) => {
  const maybeSingle = vi.fn(async () => ({ data: claim }));
  const neq2 = vi.fn(() => ({ maybeSingle }));
  const neq1 = vi.fn(() => ({ neq: neq2 }));
  const eq = vi.fn(() => ({ neq: neq1 }));
  const select = vi.fn(() => ({ eq }));
  return {
    client: { from: vi.fn(() => ({ select })) },
    spies: { select, eq, neq1, neq2, maybeSingle },
  };
};

describe("assertGuardianConfirmed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a player with an outstanding claim", async () => {
    const { client } = makeSupabase({ status: "pending" });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1", "message coaches"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows a player whose guardian confirmed", async () => {
    // A claimed claim is filtered out by the query, so the lookup returns nothing.
    const { client } = makeSupabase(null);

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1"),
    ).resolves.toBeUndefined();
  });

  it("allows a user who never had a claim", async () => {
    // Adults, parents, and minors who joined via the older family-invite path. Keying on
    // consent instead of claims would have locked this group retroactively.
    const { client } = makeSupabase(null);

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "adult-1"),
    ).resolves.toBeUndefined();
  });

  it("names the attempted action in the error", async () => {
    const { client } = makeSupabase({ status: "pending" });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1", "share your profile"),
    ).rejects.toMatchObject({
      statusMessage: expect.stringContaining("share your profile"),
    });
  });
});
