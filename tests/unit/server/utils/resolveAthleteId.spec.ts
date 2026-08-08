import { describe, it, expect, vi, beforeEach } from "vitest";

// getUserRole is the only external dependency; mock it per-test.
// vi.hoisted so the fn exists before the hoisted vi.mock factory runs.
const { getUserRole } = vi.hoisted(() => ({ getUserRole: vi.fn() }));
vi.mock("~/server/utils/auth", () => ({ getUserRole }));

import { resolveAthleteId } from "~/server/utils/resolveAthleteId";

/**
 * Minimal supabase stub: each `.from(...).select(...).eq(...).eq(...).maybeSingle()`
 * chain resolves to the next queued row. Queue order mirrors resolveAthleteId's calls
 * for a parent: [parent membership row, player member row].
 */
function supabaseReturning(rows: Array<unknown>) {
  const queue = [...rows];
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.maybeSingle = () => Promise.resolve({ data: queue.shift() ?? null });
  return { from: () => builder } as never;
}

describe("resolveAthleteId", () => {
  beforeEach(() => getUserRole.mockReset());

  it("returns the caller's own id for a player", async () => {
    getUserRole.mockResolvedValue("player");
    const sb = supabaseReturning([]);
    expect(await resolveAthleteId("player-1", sb)).toBe("player-1");
  });

  it("resolves a parent to the linked player's id", async () => {
    getUserRole.mockResolvedValue("parent");
    const sb = supabaseReturning([
      { family_unit_id: "fam-1" },
      { user_id: "player-9" },
    ]);
    expect(await resolveAthleteId("parent-1", sb)).toBe("player-9");
  });

  it("falls back to the caller's id when a parent has no family membership", async () => {
    getUserRole.mockResolvedValue("parent");
    const sb = supabaseReturning([null]);
    expect(await resolveAthleteId("parent-1", sb)).toBe("parent-1");
  });

  it("falls back to the caller's id when the family has no player member", async () => {
    getUserRole.mockResolvedValue("parent");
    const sb = supabaseReturning([{ family_unit_id: "fam-1" }, null]);
    expect(await resolveAthleteId("parent-1", sb)).toBe("parent-1");
  });
});
