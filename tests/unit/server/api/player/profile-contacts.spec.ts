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
  },
];

/**
 * Builds a mocked admin client matching this endpoint's exact call shape:
 * - `family_members` select().eq().single() → membership
 * - `profile_contacts` select().eq().order().limit() → leads
 * - `profile_contacts` select("*", {count}).eq().eq().gte() → per-type count
 */
function buildAdminMock(opts: {
  membership: { family_unit_id: string } | null;
  leads: typeof LEAD_ROWS;
  interestCount: number;
  contactCount: number;
}) {
  const from = vi.fn((table: string) => {
    if (table === "family_members") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: opts.membership, error: null }),
          }),
        }),
      };
    }
    if (table === "profile_contacts") {
      return {
        select: (_cols: string, countOpts?: { count?: string }) => {
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
          return {
            eq: () => ({
              order: () => ({
                limit: () =>
                  Promise.resolve({ data: opts.leads, error: null }),
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

    for (const lead of result.leads) {
      expect(lead).not.toHaveProperty("ip");
      expect(lead).not.toHaveProperty("user_agent");
      expect(lead).not.toHaveProperty("family_unit_id");
    }
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
