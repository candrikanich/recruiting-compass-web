/**
 * POST /api/user/export — real behavioral tests.
 *
 * planning/audit-2026-07-27-findings.md listed this GDPR/CCPA data-export
 * endpoint among the ~35/98 untested API endpoints. Covers the auth gate,
 * the once-per-24h rate limit (including that a SECOND request within the
 * window is rejected while a fresh user is not), audit logging, and error
 * handling when the export generation itself fails.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));

const mockCreateExportDownloadUrl = vi.fn();
vi.mock("~/server/utils/exportUser", () => ({
  createExportDownloadUrl: mockCreateExportDownloadUrl,
}));

const mockAuditLog = vi.fn();
const mockLogError = vi.fn();
vi.mock("~/server/utils/auditLog", () => ({
  auditLog: mockAuditLog,
  logError: mockLogError,
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
  };
});

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      data?: unknown;
    }) => Error & { statusCode: number; data?: unknown };
  }
).createError = (config) => {
  const err = new Error(config.statusMessage) as Error & {
    statusCode: number;
    data?: unknown;
  };
  err.statusCode = config.statusCode;
  err.data = config.data;
  return err;
};

function fakeEvent(): H3Event {
  return {} as H3Event;
}

describe("POST /api/user/export", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    mockCreateExportDownloadUrl.mockResolvedValue(
      "https://storage.example.com/exports/user-1.zip?token=abc",
    );
    mockAuditLog.mockResolvedValue(undefined);
    mockLogError.mockResolvedValue(undefined);
  });

  async function loadHandler() {
    return (await import("~/server/api/user/export.post")).default;
  }

  it("generates a download URL and logs the export for an authenticated user", async () => {
    const handler = await loadHandler();
    const result = (await handler(fakeEvent())) as {
      success: boolean;
      downloadUrl: string;
      expiresIn: number;
    };

    expect(result.success).toBe(true);
    expect(result.downloadUrl).toContain("user-1.zip");
    expect(result.expiresIn).toBe(7 * 24 * 60 * 60);
    expect(mockCreateExportDownloadUrl).toHaveBeenCalledWith(
      "user-1",
      7 * 24 * 60 * 60,
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "user-1", action: "EXPORT" }),
    );
  });

  it("rejects a second export request within 24 hours with 429", async () => {
    const handler = await loadHandler();
    await handler(fakeEvent());
    mockCreateExportDownloadUrl.mockClear();

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 429,
    });
    // The rate-limited request never re-generates a fresh export.
    expect(mockCreateExportDownloadUrl).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        errorMessage: expect.stringContaining("rate limit"),
      }),
    );
  });

  it("a different user is not blocked by another user's rate limit", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const handler = await loadHandler();
    await handler(fakeEvent());

    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-2",
      email: "other@example.com",
    });
    mockCreateExportDownloadUrl.mockClear();

    const result = (await handler(fakeEvent())) as { success: boolean };
    expect(result.success).toBe(true);
    expect(mockCreateExportDownloadUrl).toHaveBeenCalledWith(
      "user-2",
      expect.any(Number),
    );
  });

  it("returns 500 and logs the failure when export generation throws", async () => {
    mockCreateExportDownloadUrl.mockRejectedValue(
      new Error("storage bucket unreachable"),
    );
    const handler = await loadHandler();

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(mockLogError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        errorMessage: "storage bucket unreachable",
      }),
    );
  });

  it("propagates 401 when the caller is not authenticated", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );
    const handler = await loadHandler();

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(mockCreateExportDownloadUrl).not.toHaveBeenCalled();
  });
});
