import { describe, it, expect, vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getQuery: vi.fn(),
    setHeader: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});
vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1" }),
}));

import { getQuery, setHeader } from "h3";

const TEMPLATES = [
  "invite",
  "nudge",
  "digest",
  "deadline",
  "notification",
  "feedback",
] as const;

describe("GET /api/admin/email-preview", () => {
  it("returns rendered HTML for a valid template", async () => {
    vi.mocked(getQuery).mockReturnValue({ template: "invite" });
    const { default: handler } =
      await import("~/server/api/admin/email-preview.get");
    const result = await handler({} as never);
    expect(result).toContain('alt="The Recruiting Compass"');
  });

  it("sets the content-type header to text/html", async () => {
    vi.mocked(getQuery).mockReturnValue({ template: "invite" });
    const { default: handler } =
      await import("~/server/api/admin/email-preview.get");
    await handler({} as never);
    expect(vi.mocked(setHeader)).toHaveBeenCalledWith(
      expect.anything(),
      "content-type",
      "text/html; charset=utf-8",
    );
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

  it.each(TEMPLATES)(
    "renders the %s template with the branded logo",
    async (template) => {
      vi.mocked(getQuery).mockReturnValue({ template });
      const { default: handler } =
        await import("~/server/api/admin/email-preview.get");
      const result = await handler({} as never);
      expect(result).toContain('alt="The Recruiting Compass"');
    },
  );
});
