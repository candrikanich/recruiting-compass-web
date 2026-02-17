import { describe, it, expect, vi, afterEach } from "vitest";

// Nuxt auto-import globals used by sync-all.post.ts
(global as any).useRuntimeConfig = vi.fn(() => ({}));

// Mock dependencies at top level for Vitest hoisting
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getHeader: vi.fn(),
    createError: vi.fn((opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    }),
    defineEventHandler: vi.fn((handler: (event: unknown) => unknown) => handler),
  };
});

describe("POST /api/social/sync-all auth", () => {
  const originalSyncKey = process.env.SYNC_API_KEY;

  afterEach(() => {
    process.env.SYNC_API_KEY = originalSyncKey;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 500 when SYNC_API_KEY is not configured", async () => {
    delete process.env.SYNC_API_KEY;

    const { default: handler } = await import("~/server/api/social/sync-all.post");
    const h3 = await import("h3");
    vi.mocked(h3.getHeader).mockReturnValue(null);

    const event = { context: {}, node: { req: { headers: {} }, res: {} } } as any;
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 401 when SYNC_API_KEY is set but header is missing", async () => {
    process.env.SYNC_API_KEY = "test-secret-key";

    const { default: handler } = await import("~/server/api/social/sync-all.post");
    const h3 = await import("h3");
    vi.mocked(h3.getHeader).mockReturnValue(null);

    const event = { context: {}, node: { req: { headers: {} }, res: {} } } as any;
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns 401 when SYNC_API_KEY is set but header is wrong", async () => {
    process.env.SYNC_API_KEY = "test-secret-key";

    const { default: handler } = await import("~/server/api/social/sync-all.post");
    const h3 = await import("h3");
    vi.mocked(h3.getHeader).mockReturnValue("Bearer wrong-key");

    const event = { context: {}, node: { req: { headers: {} }, res: {} } } as any;
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });
});
