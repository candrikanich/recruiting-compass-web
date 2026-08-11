/**
 * Direct unit tests for server/utils/athleteAccess.ts's resolveTargetAthleteId
 * — the `?athleteId` authz gate flagged P0-untested in
 * planning/audit-2026-07-27-findings.md ("6. Testing"). Until now it only
 * had indirect coverage via one caller
 * (tests/integration/tasks/athlete-tasks-athlete-id.integration.spec.ts).
 * These tests isolate the helper's own branching logic with a mocked
 * Supabase client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/logger", () => {
  const stub = () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  });
  return { useLogger: stub, createLogger: stub };
});

const mockSupabaseAdmin = {
  from: vi.fn(),
};
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => mockSupabaseAdmin,
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { resolveTargetAthleteId } from "~/server/utils/athleteAccess";

function fakeEvent(): H3Event {
  return {} as H3Event;
}

function mockMemberships(
  rows: Array<{ user_id: string; family_unit_id: string }>,
) {
  mockSupabaseAdmin.from.mockReturnValue({
    select: () => ({
      in: () => Promise.resolve({ data: rows, error: null }),
    }),
  });
}

describe("resolveTargetAthleteId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the caller's own id when no athleteId is requested (self-access)", async () => {
    const result = await resolveTargetAthleteId(
      fakeEvent(),
      "caller-1",
      undefined,
    );
    expect(result).toBe("caller-1");
    expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("returns the caller's own id when requestedAthleteId equals callerId (no-op self-access)", async () => {
    const result = await resolveTargetAthleteId(
      fakeEvent(),
      "caller-1",
      "caller-1",
    );
    expect(result).toBe("caller-1");
    expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("returns the requested id when caller and athlete share a family unit", async () => {
    mockMemberships([
      { user_id: "parent-1", family_unit_id: "family-a" },
      { user_id: "athlete-1", family_unit_id: "family-a" },
    ]);

    const result = await resolveTargetAthleteId(
      fakeEvent(),
      "parent-1",
      "athlete-1",
    );
    expect(result).toBe("athlete-1");
  });

  it("rejects with 403 when caller and athlete share no family unit (legitimate relationship required)", async () => {
    mockMemberships([
      { user_id: "parent-1", family_unit_id: "family-a" },
      { user_id: "athlete-1", family_unit_id: "family-b" },
    ]);

    await expect(
      resolveTargetAthleteId(fakeEvent(), "parent-1", "athlete-1"),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to view this athlete",
    });
  });

  it("rejects with 403 when the caller has no family membership at all", async () => {
    mockMemberships([{ user_id: "athlete-1", family_unit_id: "family-a" }]);

    await expect(
      resolveTargetAthleteId(fakeEvent(), "parent-1", "athlete-1"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects with 403 when the requested athlete has no family membership at all", async () => {
    mockMemberships([{ user_id: "parent-1", family_unit_id: "family-a" }]);

    await expect(
      resolveTargetAthleteId(fakeEvent(), "parent-1", "athlete-1"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects with 500 when the membership query errors", async () => {
    mockSupabaseAdmin.from.mockReturnValue({
      select: () => ({
        in: () =>
          Promise.resolve({ data: null, error: { message: "db down" } }),
      }),
    });

    await expect(
      resolveTargetAthleteId(fakeEvent(), "parent-1", "athlete-1"),
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to verify athlete access",
    });
  });

  it("treats an empty-string requestedAthleteId as no request (falsy, self-access)", async () => {
    const result = await resolveTargetAthleteId(fakeEvent(), "caller-1", "");
    expect(result).toBe("caller-1");
    expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("rejects a malformed/unknown requestedAthleteId that matches no membership row", async () => {
    mockMemberships([{ user_id: "parent-1", family_unit_id: "family-a" }]);

    await expect(
      resolveTargetAthleteId(fakeEvent(), "parent-1", "not-a-real-uuid-at-all"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("only authorizes access when BOTH caller and athlete rows share the SAME family unit id (not merely each having some membership)", async () => {
    // Caller belongs to family-a AND family-c; athlete belongs only to
    // family-b — no shared unit despite the caller having multiple rows.
    mockMemberships([
      { user_id: "parent-1", family_unit_id: "family-a" },
      { user_id: "parent-1", family_unit_id: "family-c" },
      { user_id: "athlete-1", family_unit_id: "family-b" },
    ]);

    await expect(
      resolveTargetAthleteId(fakeEvent(), "parent-1", "athlete-1"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
