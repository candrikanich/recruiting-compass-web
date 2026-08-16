/**
 * GET /api/cron/orphaned-storage-sweep — safety-critical, since it deletes
 * storage objects. Covers: a LIVE user's objects are never removed, a DEAD
 * user's objects ARE removed, dryRun removes nothing but still reports counts,
 * exports older than 7d are swept while fresh ones survive, and a user-lookup
 * error fails SAFE (treats the prefix as live → no deletion).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

process.env.CRON_SECRET = "test-cron-secret";

const LIVE_USER = "11111111-1111-4111-8111-111111111111";
const DEAD_USER = "22222222-2222-4222-8222-222222222222";

let removed: Record<string, string[]>;
let userLookupError: boolean;
// bucket -> prefix -> entries returned by list()
let listing: Record<
  string,
  Record<string, { name: string; id: string | null; created_at?: string }[]>
>;

function storageFrom(bucket: string) {
  return {
    list: (prefix: string, opts: { offset: number }) => {
      if (opts.offset > 0) return Promise.resolve({ data: [], error: null });
      const data = listing[bucket]?.[prefix] ?? [];
      return Promise.resolve({ data, error: null });
    },
    remove: (paths: string[]) => {
      removed[bucket] = (removed[bucket] ?? []).concat(paths);
      return Promise.resolve({ error: null });
    },
  };
}

const supabaseMock = {
  from: (table: string) => {
    if (table === "cron_runs") {
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "run-1" }, error: null }),
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    }
    if (table === "users") {
      return {
        select: () => ({
          in: (_col: string, ids: string[]) =>
            userLookupError
              ? Promise.resolve({ data: null, error: { message: "db down" } })
              : Promise.resolve({
                  data: ids
                    .filter((id) => id === LIVE_USER)
                    .map((id) => ({ id })),
                  error: null,
                }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  },
  storage: { from: storageFrom },
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => supabaseMock,
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
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
    defineEventHandler: (fn: unknown) => fn,
    // Parse the query straight off our fake event's url — the real getQuery
    // relies on Nitro-created event internals our stub doesn't have.
    getQuery: (event: { node: { req: { url?: string } } }) => {
      const url = event.node.req.url ?? "";
      const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
      return Object.fromEntries(new URLSearchParams(q));
    },
  };
});

function fakeEvent(url = "/api/cron/orphaned-storage-sweep"): H3Event {
  return {
    node: {
      req: { headers: { authorization: "Bearer test-cron-secret" }, url },
      res: {},
    },
  } as unknown as H3Event;
}

async function loadHandler() {
  return (await import("~/server/api/cron/orphaned-storage-sweep.get")).default;
}

function emptyBuckets() {
  return {
    documents: { "": [] },
    "interaction-attachments": { "": [] },
    "profile-photos": { "": [] },
    exports: { "": [] },
  } as typeof listing;
}

describe("GET /api/cron/orphaned-storage-sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    removed = {};
    userLookupError = false;
    listing = emptyBuckets();
  });

  it("deletes a dead user's objects but never a live user's", async () => {
    listing.documents = {
      "": [
        { name: LIVE_USER, id: null },
        { name: DEAD_USER, id: null },
      ],
      [LIVE_USER]: [{ name: "keep.pdf", id: "f1" }],
      [DEAD_USER]: [{ name: "gone.pdf", id: "f2" }],
    };
    const handler = await loadHandler();

    const result = (await handler(fakeEvent())) as {
      totalObjects: number;
      perBucket: Record<string, { deadUsers: number; objects: number }>;
    };

    expect(removed.documents).toEqual([`${DEAD_USER}/gone.pdf`]);
    expect(removed.documents).not.toContain(`${LIVE_USER}/keep.pdf`);
    expect(result.perBucket.documents).toEqual({ deadUsers: 1, objects: 1 });
    expect(result.totalObjects).toBe(1);
  });

  it("recurses into nested prefixes (interaction-attachments)", async () => {
    listing["interaction-attachments"] = {
      "": [{ name: DEAD_USER, id: null }],
      [DEAD_USER]: [{ name: "interaction-9", id: null }],
      [`${DEAD_USER}/interaction-9`]: [{ name: "clip.mp4", id: "f9" }],
    };
    const handler = await loadHandler();
    await handler(fakeEvent());
    expect(removed["interaction-attachments"]).toEqual([
      `${DEAD_USER}/interaction-9/clip.mp4`,
    ]);
  });

  it("dryRun=1 reports counts but removes nothing", async () => {
    listing.documents = {
      "": [{ name: DEAD_USER, id: null }],
      [DEAD_USER]: [{ name: "gone.pdf", id: "f2" }],
    };
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent("/api/cron/orphaned-storage-sweep?dryRun=1"),
    )) as { dryRun: boolean; totalObjects: number };

    expect(result.dryRun).toBe(true);
    expect(result.totalObjects).toBe(1);
    expect(removed.documents).toBeUndefined();
  });

  it("sweeps exports older than 7d, keeps fresh ones", async () => {
    const old = new Date(Date.now() - 10 * 864e5).toISOString();
    const fresh = new Date(Date.now() - 1 * 864e5).toISOString();
    listing.exports = {
      "": [
        { name: "export_old.zip", id: "e1", created_at: old },
        { name: "export_fresh.zip", id: "e2", created_at: fresh },
      ],
    };
    const handler = await loadHandler();

    const result = (await handler(fakeEvent())) as { expiredExports: number };

    expect(removed.exports).toEqual(["export_old.zip"]);
    expect(result.expiredExports).toBe(1);
  });

  it("fails safe when the user lookup errors — no deletion", async () => {
    userLookupError = true;
    listing.documents = {
      "": [{ name: DEAD_USER, id: null }],
      [DEAD_USER]: [{ name: "gone.pdf", id: "f2" }],
    };
    const handler = await loadHandler();

    const result = (await handler(fakeEvent())) as { totalObjects: number };

    expect(removed.documents).toBeUndefined();
    expect(result.totalObjects).toBe(0);
  });

  it("rejects an unauthorized request (401)", async () => {
    const handler = await loadHandler();
    const noAuth = {
      node: { req: { headers: {}, url: "/x" }, res: {} },
    } as unknown as H3Event;
    await expect(handler(noAuth)).rejects.toMatchObject({ statusCode: 401 });
  });
});
