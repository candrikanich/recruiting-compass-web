import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCursorPagination } from "~/composables/useCursorPagination";

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

// A minimal chainable Supabase query-builder mock: every chain method
// returns `this`, and the builder itself is thenable so `await query`
// resolves the queued response.
function makeQueryBuilder(
  responses: Array<{ data: unknown[] | null; error: unknown }>,
) {
  let callIndex = -1;
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (v: unknown) => unknown) => {
      callIndex += 1;
      return Promise.resolve(
        responses[callIndex] ?? { data: [], error: null },
      ).then(resolve);
    },
  };
  return builder;
}

describe("useCursorPagination — compound (timestamp, id) cursor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("orders by both the cursor column and id, breaking ties deterministically", async () => {
    const builder = makeQueryBuilder([
      {
        data: [
          { id: "row-1", occurred_at: "2026-01-01T00:00:00Z" },
          { id: "row-2", occurred_at: "2026-01-01T00:00:00Z" },
        ],
        error: null,
      },
    ]);

    const { loadMore, items } = useCursorPagination(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      builder as any,
      "occurred_at",
      20,
      "desc",
    );
    await loadMore();

    expect(items.value).toHaveLength(2);
    expect(builder.order).toHaveBeenNthCalledWith(1, "occurred_at", {
      ascending: false,
    });
    expect(builder.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
  });

  it("BUG regression: does not skip a same-timestamp row on the next page — uses (occurred_at, id) as the seek filter", async () => {
    // Page 1: two rows share the exact same timestamp (bulk import). A
    // naive single-column `lt(occurred_at, lastTimestamp)` cursor would
    // exclude BOTH remaining same-timestamp rows on page 2, even though
    // one of them (row-2) hasn't been returned yet.
    const sameTimestamp = "2026-01-01T00:00:00Z";
    const builder = makeQueryBuilder([
      {
        // pageSize=1, so a 2nd row here is the "fetch one extra to detect
        // hasMore" row and gets popped — this keeps hasMore true so the
        // test can actually drive a second loadMore() call.
        data: [
          { id: "row-1", occurred_at: sameTimestamp },
          { id: "row-2", occurred_at: sameTimestamp },
        ],
        error: null,
      },
      {
        data: [{ id: "row-2", occurred_at: sameTimestamp }],
        error: null,
      },
    ]);

    const { loadMore, items } = useCursorPagination(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      builder as any,
      "occurred_at",
      1,
      "desc",
    );

    await loadMore(); // page 1: row-1
    expect(items.value.map((i) => i.id)).toEqual(["row-1"]);

    await loadMore(); // page 2: must still surface row-2

    // The compound filter must reference both the cursor column AND id —
    // proving the cursor isn't relying on the timestamp alone to exclude
    // already-seen rows.
    const orFilterArg = (builder.or as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(orFilterArg).toContain("occurred_at.lt.");
    expect(orFilterArg).toContain("id.lt.row-1");

    expect(items.value.map((i) => i.id)).toEqual(["row-1", "row-2"]);
  });
});
