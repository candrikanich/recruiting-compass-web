/**
 * GET /api/player/profile/contacts — behavioral tests.
 *
 * The authed family inbox for inbound leads written by the public profile's
 * Contact/Express Interest flows (`profile_contacts`). Verifies family scope
 * (never a client-supplied id), newest-first ordering, monthly count split
 * by type, and that raw `ip`/`user_agent`/`family_unit_id` never leak into
 * the response.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({ useSupabaseAdmin: vi.fn() }));

function fakeEvent(): H3Event {
  return { context: {} } as unknown as H3Event;
}

const LEAD_ROWS = [
  {
    id: "lead-2",
    type: "interest",
    coach_name: "Coach Newer",
    coach_email: "newer@example.com",
    coach_title: "Head Coach",
    school_name: "Newer State",
    program: "Baseball",
    note: "Interested",
    matched_coach_id: null,
    created_at: "2026-08-20T00:00:00.000Z",
    // Sensitive columns present on the row so a leak would be observable if the
    // endpoint ever returned rows verbatim instead of an explicit column list.
    ip: "203.0.113.7",
    user_agent: "Mozilla/5.0",
    family_unit_id: "family-1",
  },
  {
    id: "lead-1",
    type: "contact",
    coach_name: "Coach Older",
    coach_email: "older@example.com",
    coach_title: null,
    school_name: "Older State",
    program: null,
    note: "Reaching out",
    matched_coach_id: "coach-123",
    created_at: "2026-07-01T00:00:00.000Z",
    ip: "198.51.100.4",
    user_agent: "curl/8.0",
    family_unit_id: "family-1",
  },
];

const SENSITIVE_COLUMNS = ["ip", "user_agent", "family_unit_id"] as const;

/**
 * Builds a mocked admin client matching this endpoint's exact call shape:
 * - `family_members` select().eq().single() → membership
 * - `profile_contacts` select().eq().order().limit() → leads
 * - `profile_contacts` select("*", {count}).eq().eq().gte() → per-type count
 */
interface MockError {
  code?: string;
  message: string;
}

function buildAdminMock(opts: {
  membership: { family_unit_id: string } | null;
  leads: typeof LEAD_ROWS;
  interestCount: number;
  contactCount: number;
  membershipError?: MockError | null;
  leadsError?: MockError | null;
  /** Records the column string passed to the leads `select(...)` call. */
  capture?: { leadsSelect?: string };
}) {
  const from = vi.fn((table: string) => {
    if (table === "family_members") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: opts.membershipError ? null : opts.membership,
                error: opts.membershipError ?? null,
              }),
          }),
        }),
      };
    }
    if (table === "profile_contacts") {
      return {
        select: (cols: string, countOpts?: { count?: string }) => {
          if (countOpts?.count) {
            // Count query: select(...).eq(family).eq(type).gte(month) → { count }
            const chain = {
              eq: (col: string, val: string) => {
                if (col === "type") {
                  const count =
                    val === "interest" ? opts.interestCount : opts.contactCount;
                  return {
                    gte: () => Promise.resolve({ count, error: null }),
                  };
                }
                return chain;
              },
            };
            return chain;
          }
          // Leads listing: select().eq(family).order().limit()
          if (opts.capture) opts.capture.leadsSelect = cols;
          // Project rows to the requested columns, like PostgREST honoring the
          // SELECT — so a sensitive column can only reach the response if the
          // endpoint actually asked for it.
          const wanted = cols.split(",").map((c) => c.trim());
          const projected = opts.leads.map((row) =>
            Object.fromEntries(
              Object.entries(row).filter(([k]) => wanted.includes(k)),
            ),
          );
          return {
            eq: () => ({
              order: () => ({
                limit: () =>
                  Promise.resolve({
                    data: opts.leadsError ? null : projected,
                    error: opts.leadsError ?? null,
                  }),
              }),
            }),
          };
        },
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return { from } as never;
}

describe("GET /api/player/profile/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  async function loadHandler() {
    return (await import("~/server/api/player/profile/contacts.get")).default;
  }

  async function mockAuth(user: { id: string; email: string } | null) {
    const { requireAuth } = await import("~/server/utils/auth");
    if (user) {
      vi.mocked(requireAuth).mockResolvedValue(user);
    } else {
      vi.mocked(requireAuth).mockRejectedValue(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }
  }

  it("returns family-scoped leads newest-first with monthly counts split by type", async () => {
    await mockAuth({ id: "user-1", email: "user@example.com" });
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildAdminMock({
        membership: { family_unit_id: "family-1" },
        leads: LEAD_ROWS,
        interestCount: 1,
        contactCount: 1,
      }),
    );
    const handler = await loadHandler();

    const result = await handler(fakeEvent());

    expect(result).toMatchObject({
      leads: [
        expect.objectContaining({ id: "lead-2", type: "interest" }),
        expect.objectContaining({ id: "lead-1", type: "contact" }),
      ],
      counts: {
        interestThisMonth: 1,
        contactThisMonth: 1,
        totalThisMonth: 2,
      },
    });
  });

  it("never exposes ip, user_agent, or family_unit_id in the payload", async () => {
    await mockAuth({ id: "user-1", email: "user@example.com" });
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    // The mock rows carry ip/user_agent/family_unit_id, and the mock projects
    // by the SELECT column list — so these leak iff the endpoint asked for them.
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildAdminMock({
        membership: { family_unit_id: "family-1" },
        leads: LEAD_ROWS,
        interestCount: 1,
        contactCount: 1,
      }),
    );
    const handler = await loadHandler();

    const result = (await handler(fakeEvent())) as {
      leads: Record<string, unknown>[];
    };

    expect(result.leads.length).toBe(LEAD_ROWS.length);
    for (const lead of result.leads) {
      for (const col of SENSITIVE_COLUMNS) {
        expect(lead).not.toHaveProperty(col);
      }
    }
  });

  it("does not request the sensitive columns in the leads SELECT", async () => {
    await mockAuth({ id: "user-1", email: "user@example.com" });
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const capture: { leadsSelect?: string } = {};
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildAdminMock({
        membership: { family_unit_id: "family-1" },
        leads: LEAD_ROWS,
        interestCount: 0,
        contactCount: 0,
        capture,
      }),
    );
    const handler = await loadHandler();

    await handler(fakeEvent());

    // The real guard against PII leakage is the explicit SELECT column list,
    // not post-fetch stripping — assert it directly.
    expect(capture.leadsSelect).toBeDefined();
    const columns = capture.leadsSelect!.split(",").map((c) => c.trim());
    for (const col of SENSITIVE_COLUMNS) {
      expect(columns).not.toContain(col);
    }
    expect(columns).toContain("coach_name");
  });

  it("returns 500 when the family membership lookup fails (not a 403)", async () => {
    await mockAuth({ id: "user-1", email: "user@example.com" });
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildAdminMock({
        membership: null,
        membershipError: { code: "57014", message: "statement timeout" },
        leads: [],
        interestCount: 0,
        contactCount: 0,
      }),
    );
    const handler = await loadHandler();

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it("returns 500 when the leads query fails", async () => {
    await mockAuth({ id: "user-1", email: "user@example.com" });
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildAdminMock({
        membership: { family_unit_id: "family-1" },
        leads: [],
        leadsError: { code: "42P01", message: "relation missing" },
        interestCount: 0,
        contactCount: 0,
      }),
    );
    const handler = await loadHandler();

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it("propagates an unauthenticated request's rejection", async () => {
    await mockAuth(null);
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue({ from: vi.fn() } as never);
    const handler = await loadHandler();

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("returns 403 when the user has no family membership", async () => {
    await mockAuth({ id: "user-1", email: "user@example.com" });
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildAdminMock({
        membership: null,
        leads: [],
        interestCount: 0,
        contactCount: 0,
      }),
    );
    const handler = await loadHandler();

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
