import { describe, it, expect, vi, beforeEach } from "vitest";

const ACCOUNT_ID = "11111111-1111-1111-1111-111111111111";
const ACCOUNT = {
  id: ACCOUNT_ID,
  email: "u@x.com",
  full_name: "U",
  role: "player",
  is_admin: false,
  created_at: "2026-01-01T00:00:00Z",
  graduation_year: 2027,
  current_phase: "build",
  onboarding_completed: true,
  status_label: "on_track",
  deletion_requested_at: null,
};

// Rows keyed by table name; reset in beforeEach.
const tables: Record<string, unknown[]> = {};

// Chainable query-builder stub matching the real @supabase/supabase-js shape:
// - non-terminal calls (select/eq/order/limit) return `this`
// - maybeSingle() resolves { data: rows[0] ?? null, error: null }
// - the builder itself is thenable, resolving { data: rows, error: null, count: rows.length }
//   (used both for row-list awaits and for head:true count queries)
function tableStub(name: string) {
  const rows = tables[name] ?? [];
  const builder: PromiseLike<{ data: unknown[]; error: null; count: number }> & {
    select: (...args: unknown[]) => typeof builder;
    eq: (...args: unknown[]) => typeof builder;
    order: (...args: unknown[]) => typeof builder;
    limit: (...args: unknown[]) => typeof builder;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
  } = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown[]; error: null; count: number }) => unknown) =>
      Promise.resolve(resolve({ data: rows, error: null, count: rows.length })),
  } as never;
  return builder;
}

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({ from: (t: string) => tableStub(t) }),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn(async (event: { context: Record<string, unknown> }) => {
    event.context.adminUserId = "admin-1";
    return { id: "admin-1" };
  }),
}));

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(
    (event: { context: { params: { id: string } } }) => {
      const id = event.context.params.id;
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(id)) {
        const err = new Error("Invalid id: must be a valid UUID") as Error & {
          statusCode: number;
        };
        err.statusCode = 400;
        throw err;
      }
      return id;
    },
  ),
}));

vi.mock("~/server/utils/adminAudit", () => ({
  logAdminAction: vi.fn(async () => {}),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import handler from "~/server/api/admin/users/[id].get";
import { requireAdmin } from "~/server/utils/auth";
import { logAdminAction } from "~/server/utils/adminAudit";

const mkEvent = (id: string) =>
  ({ context: { params: { id } }, node: { req: {} } }) as never;

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  tables["users"] = [ACCOUNT];
  tables["family_members"] = [{ user_id: ACCOUNT.id, family_unit_id: "fam-1" }];
  tables["family_units"] = [{ id: "fam-1", name: "The Family" }];
  tables["family_invitations"] = [];
  tables["player_profiles"] = [];
  tables["interactions"] = [];
  tables["offers"] = [];
  tables["events"] = [];
  tables["athlete_messages"] = [];
  tables["schools"] = [];
  tables["coaches"] = [];
  vi.mocked(requireAdmin).mockClear();
  vi.mocked(logAdminAction).mockClear();
});

describe("GET /api/admin/users/[id]", () => {
  it("returns account with only allowlisted keys", async () => {
    const res = await handler(mkEvent(ACCOUNT.id));
    expect(Object.keys(res.account).sort()).toEqual(
      [
        "created_at",
        "current_phase",
        "deletion_requested_at",
        "email",
        "full_name",
        "graduation_year",
        "id",
        "is_admin",
        "onboarding_completed",
        "role",
        "status_label",
      ].sort(),
    );
    expect(res.account).not.toHaveProperty("gpa");
    expect(res.account).not.toHaveProperty("date_of_birth");
  });

  it("calls requireAdmin before any DB work", async () => {
    await handler(mkEvent(ACCOUNT.id));
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("logs a view_as.start audit row with target + family unit", async () => {
    await handler(mkEvent(ACCOUNT.id));
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "view_as.start",
        targetUserId: ACCOUNT.id,
        meta: expect.objectContaining({ family_unit_id: "fam-1" }),
      }),
    );
  });

  it("400s on a malformed uuid", async () => {
    await expect(handler(mkEvent("not-a-uuid"))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("404s when the user is not found", async () => {
    tables["users"] = [];
    await expect(handler(mkEvent(ACCOUNT.id))).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("handles a user with no family unit (no 500)", async () => {
    tables["family_members"] = [];
    const res = await handler(mkEvent(ACCOUNT.id));
    expect(res.familyUnitId).toBeNull();
    expect(res.family.members).toEqual([]);
    expect(res.family.unit).toBeNull();
    expect(res.recruiting.counts.schools).toBe(0);

    expect(logAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "view_as.start",
        targetUserId: ACCOUNT.id,
        meta: expect.objectContaining({ family_unit_id: null }),
      }),
    );
  });

  it("populates family-scoped recruiting counts and family unit when present", async () => {
    tables["schools"] = [{ id: "s1", family_unit_id: "fam-1" }];
    tables["coaches"] = [{ id: "c1" }, { id: "c2" }];
    const res = await handler(mkEvent(ACCOUNT.id));
    expect(res.familyUnitId).toBe("fam-1");
    expect(res.family.unit).toEqual({ id: "fam-1", name: "The Family" });
    expect(res.recruiting.counts.schools).toBe(1);
    expect(res.recruiting.counts.coaches).toBe(2);
  });
});
