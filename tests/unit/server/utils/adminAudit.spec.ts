import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({ from: () => ({ insert: insertMock }) }),
}));
const loggerError = vi.fn();
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ error: loggerError, info: vi.fn() }),
}));

import { logAdminAction } from "~/server/utils/adminAudit";

const fakeEvent = { context: { adminUserId: "admin-1" } } as any;

beforeEach(() => {
  insertMock.mockReset();
  loggerError.mockReset();
});

describe("logAdminAction", () => {
  it("inserts an audit row with actor, action, target, meta", async () => {
    insertMock.mockResolvedValue({ error: null });
    await logAdminAction(fakeEvent, {
      action: "view_as.start",
      targetUserId: "u-9",
      meta: { ip: "x" },
    });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_admin_id: "admin-1",
        action: "view_as.start",
        target_user_id: "u-9",
        meta: { ip: "x" },
      }),
    );
  });

  it("never throws when the insert fails — logs instead", async () => {
    insertMock.mockResolvedValue({ error: { message: "boom" } });
    await expect(
      logAdminAction(fakeEvent, { action: "user.delete", targetUserId: "u-1" }),
    ).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalled();
  });

  it("never throws when the insert rejects", async () => {
    insertMock.mockRejectedValue(new Error("network"));
    await expect(
      logAdminAction(fakeEvent, { action: "admin.grant" }),
    ).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalled();
  });
});
