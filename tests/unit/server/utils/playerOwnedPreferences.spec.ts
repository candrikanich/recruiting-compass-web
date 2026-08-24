import { describe, it, expect, vi, beforeEach } from "vitest";

// getUserRole is the only external dependency of resolvePreferenceTargetUserId.
const { getUserRole } = vi.hoisted(() => ({ getUserRole: vi.fn() }));
vi.mock("~/server/utils/auth", () => ({ getUserRole }));

import {
  getLinkedAthleteId,
  resolvePreferenceTargetUserId,
} from "~/server/utils/playerOwnedPreferences";

/**
 * Minimal supabase stub. Each terminal call (`.maybeSingle()` or awaiting the
 * builder itself for a list query) resolves to the next queued result, in the
 * order getLinkedAthleteId issues them:
 *   [ parent-membership row (maybeSingle),
 *     player-member rows (list),
 *     athlete users rows (list, only when >1 player) ]
 */
function supabaseReturning(steps: Array<unknown>) {
  const queue = [...steps];
  const next = () => Promise.resolve({ data: queue.shift() ?? null });
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.in = () => builder;
  builder.maybeSingle = () => next();
  // Thenable so `await supabase.from(...).select(...).eq(...)` resolves a list.
  builder.then = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown,
  ) => next().then(resolve, reject);
  return { from: () => builder } as never;
}

describe("getLinkedAthleteId", () => {
  it("returns null when the parent has no family membership", async () => {
    const sb = supabaseReturning([null]);
    expect(await getLinkedAthleteId("parent-1", sb)).toBeNull();
  });

  it("returns null when the family has no player member", async () => {
    const sb = supabaseReturning([{ family_unit_id: "fam-1" }, []]);
    expect(await getLinkedAthleteId("parent-1", sb)).toBeNull();
  });

  it("resolves the single linked athlete", async () => {
    const sb = supabaseReturning([
      { family_unit_id: "fam-1" },
      [{ user_id: "player-9" }],
    ]);
    expect(await getLinkedAthleteId("parent-1", sb)).toBe("player-9");
  });

  it("resolves to the athlete closest to graduation when there are several", async () => {
    const sb = supabaseReturning([
      { family_unit_id: "fam-1" },
      [{ user_id: "p-older" }, { user_id: "p-sooner" }],
      [
        { id: "p-older", graduation_year: 2028, created_at: "2020-01-01" },
        { id: "p-sooner", graduation_year: 2026, created_at: "2021-01-01" },
      ],
    ]);
    // Must not error/return null on >1 player — the maybeSingle() bug that
    // dropped multi-athlete parents to their own empty preference row.
    expect(await getLinkedAthleteId("parent-1", sb)).toBe("p-sooner");
  });

  it("breaks graduation-year ties toward the oldest account (deterministic)", async () => {
    const sb = supabaseReturning([
      { family_unit_id: "fam-1" },
      [{ user_id: "p-new" }, { user_id: "p-old" }],
      [
        { id: "p-new", graduation_year: null, created_at: "2021-01-01" },
        { id: "p-old", graduation_year: null, created_at: "2020-01-01" },
      ],
    ]);
    expect(await getLinkedAthleteId("parent-1", sb)).toBe("p-old");
  });
});

describe("resolvePreferenceTargetUserId", () => {
  beforeEach(() => getUserRole.mockReset());

  it("uses the caller's own id for non-player-owned categories", async () => {
    const sb = supabaseReturning([]);
    expect(
      await resolvePreferenceTargetUserId("user-1", "notifications", sb),
    ).toBe("user-1");
  });

  it("uses the caller's own id for a player", async () => {
    getUserRole.mockResolvedValue("player");
    const sb = supabaseReturning([]);
    expect(await resolvePreferenceTargetUserId("player-1", "player", sb)).toBe(
      "player-1",
    );
  });

  it("redirects a parent to their linked athlete for player-owned categories", async () => {
    getUserRole.mockResolvedValue("parent");
    const sb = supabaseReturning([
      { family_unit_id: "fam-1" },
      [{ user_id: "player-9" }],
    ]);
    expect(await resolvePreferenceTargetUserId("parent-1", "player", sb)).toBe(
      "player-9",
    );
  });
});
