/**
 * useDocumentSharing composable — real behavioral tests.
 *
 * planning/audit-2026-07-27-findings.md named this among the high-risk
 * composables with no dedicated spec (150 lines, mutates which schools can
 * see an athlete's document). Covers the auth guard, shareDocument's
 * happy/error paths, and revokeSharing's read-then-filter-then-write
 * sequence (including that revoking a school not currently shared is a
 * no-op write, and that a missing document is a clean error, not a crash).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDocumentSharing } from "~/composables/useDocumentSharing";
import type { Document } from "~/types/models";

const mockSupabase = { from: vi.fn() };
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

const mockUserState: { user: { id: string; email: string } | null } = {
  user: { id: "user-123", email: "test@example.com" },
};
vi.mock("~/stores/user", () => ({
  useUserStore: () => mockUserState,
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("useDocumentSharing.shareDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState.user = { id: "user-123", email: "test@example.com" };
  });

  it("throws when no user is authenticated", async () => {
    mockUserState.user = null;
    const { shareDocument } = useDocumentSharing();

    await expect(shareDocument("doc-1", ["school-1"])).rejects.toThrow(
      "User not authenticated",
    );
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("updates shared_with_schools and returns the updated document", async () => {
    const updated = {
      id: "doc-1",
      shared_with_schools: ["school-1", "school-2"],
    } as Document;
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: updated, error: null }),
        }),
      }),
    });
    mockSupabase.from.mockReturnValue({ update: updateSpy });

    const { shareDocument, isSharing } = useDocumentSharing();
    const result = await shareDocument("doc-1", ["school-1", "school-2"]);

    expect(updateSpy).toHaveBeenCalledWith({
      shared_with_schools: ["school-1", "school-2"],
    });
    expect(result).toEqual(updated);
    expect(isSharing.value).toBe(false);
  });

  it("sets error.value and rethrows when the update fails", async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: null, error: new Error("RLS denied") }),
          }),
        }),
      }),
    });

    const { shareDocument, error } = useDocumentSharing();
    await expect(shareDocument("doc-1", ["school-1"])).rejects.toThrow(
      "RLS denied",
    );
    expect(error.value).toBe("RLS denied");
  });
});

describe("useDocumentSharing.revokeSharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState.user = { id: "user-123", email: "test@example.com" };
  });

  it("throws when no user is authenticated, without querying the document", async () => {
    mockUserState.user = null;
    const { revokeSharing } = useDocumentSharing();

    await expect(revokeSharing("doc-1", "school-1")).rejects.toThrow(
      "User not authenticated",
    );
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("removes only the target school from shared_with_schools, preserving the rest", async () => {
    const selectSingle = vi.fn().mockResolvedValue({
      data: { shared_with_schools: ["school-1", "school-2", "school-3"] },
      error: null,
    });
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "doc-1", shared_with_schools: ["school-1", "school-3"] },
            error: null,
          }),
        }),
      }),
    });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: selectSingle }),
      }),
      update: updateSpy,
    });

    const { revokeSharing } = useDocumentSharing();
    const result = await revokeSharing("doc-1", "school-2");

    expect(updateSpy).toHaveBeenCalledWith({
      shared_with_schools: ["school-1", "school-3"],
    });
    expect(result).toEqual({
      id: "doc-1",
      shared_with_schools: ["school-1", "school-3"],
    });
  });

  it("is a no-op write (still succeeds) when the school being revoked wasn't shared", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { shared_with_schools: ["school-1"] },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "doc-1", shared_with_schools: ["school-1"] },
              error: null,
            }),
          }),
        }),
      }),
    });

    const { revokeSharing } = useDocumentSharing();
    const result = await revokeSharing("doc-1", "school-not-shared");
    expect(result?.shared_with_schools).toEqual(["school-1"]);
  });

  it("handles a document with no shared_with_schools yet (null) without throwing", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { shared_with_schools: null }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "doc-1", shared_with_schools: [] },
              error: null,
            }),
          }),
        }),
      }),
    });

    const { revokeSharing } = useDocumentSharing();
    await expect(
      revokeSharing("doc-1", "school-1"),
    ).resolves.toEqual({ id: "doc-1", shared_with_schools: [] });
  });

  it("throws a clean 'Document not found' error (not a crash) when the document doesn't exist", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const { revokeSharing, error } = useDocumentSharing();
    await expect(revokeSharing("missing-doc", "school-1")).rejects.toThrow(
      "Document not found",
    );
    expect(error.value).toBe("Document not found");
  });
});
