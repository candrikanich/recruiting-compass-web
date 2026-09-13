import { describe, it, expect, vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getQuery: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});
vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1" }),
}));

import { getQuery } from "h3";

describe("GET /api/admin/email-preview", () => {
  it("returns rendered HTML for a valid template", async () => {
    vi.mocked(getQuery).mockReturnValue({ template: "invite" });
    const { default: handler } =
      await import("~/server/api/admin/email-preview.get");
    const result = await handler({} as never);
    expect(result.html).toContain('alt="The Recruiting Compass"');
  });

  it("rejects an unknown template", async () => {
    vi.mocked(getQuery).mockReturnValue({ template: "nonsense" });
    const { default: handler } =
      await import("~/server/api/admin/email-preview.get");
    await expect(handler({} as never)).rejects.toThrow();
  });

  it("requires admin auth", async () => {
    const { requireAdmin } = await import("~/server/utils/auth");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("not admin"));
    vi.mocked(getQuery).mockReturnValue({ template: "invite" });
    const { default: handler } =
      await import("~/server/api/admin/email-preview.get");
    await expect(handler({} as never)).rejects.toThrow("not admin");
  });
});
