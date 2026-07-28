/**
 * POST /api/suggestions/surface — real behavioral tests.
 *
 * planning/audit-2026-07-27-findings.md listed the suggestions surface
 * endpoint among the ~35/98 untested API endpoints; useSuggestions.spec.ts
 * only exercises the client-side $fetch call (mocked away), never this
 * server handler. Covers the auth gate, the happy path (surfaces up to 3
 * at a time, matching the real cap), and that a downstream failure
 * degrades to a `success: false` response rather than throwing/500ing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({})),
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockSurfacePendingSuggestions = vi.fn();
vi.mock("~/server/utils/suggestionStaggering", () => ({
  surfacePendingSuggestions: mockSurfacePendingSuggestions,
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
  };
});

function fakeEvent(): H3Event {
  return {} as H3Event;
}

async function loadHandler() {
  return (await import("~/server/api/suggestions/surface.post")).default;
}

describe("POST /api/suggestions/surface", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockResolvedValue({
      id: "athlete-1",
      email: "athlete@example.com",
    });
  });

  it("propagates the auth gate's rejection", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );
    const handler = await loadHandler();

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("surfaces up to 3 pending suggestions for the authenticated caller", async () => {
    mockSurfacePendingSuggestions.mockResolvedValue(2);
    const handler = await loadHandler();

    const result = await handler(fakeEvent());
    expect(result).toEqual({ success: true, surfacedCount: 2 });
    expect(mockSurfacePendingSuggestions).toHaveBeenCalledWith(
      expect.anything(),
      "athlete-1",
      3,
    );
  });

  it("degrades to success:false (not a throw) when surfacing fails", async () => {
    mockSurfacePendingSuggestions.mockRejectedValue(
      new Error("db timeout"),
    );
    const handler = await loadHandler();

    const result = await handler(fakeEvent());
    expect(result).toEqual({
      success: false,
      error: "Failed to surface suggestions",
    });
  });
});
