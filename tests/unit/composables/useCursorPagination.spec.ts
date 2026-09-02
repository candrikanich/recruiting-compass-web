import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useCursorPagination,
  useTypedCursorPagination,
} from "~/composables/useCursorPagination";

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

  it("reset clears items and reloads first page", async () => {
    const builder = makeQueryBuilder([
      {
        data: [{ id: "row-1", occurred_at: "2026-01-01" }],
        error: null,
      },
      {
        data: [{ id: "row-A", occurred_at: "2026-02-01" }],
        error: null,
      },
    ]);

    const { loadMore, reset, items, count } = useCursorPagination(
      builder as any,
      "occurred_at",
      20,
      "desc",
    );

    await loadMore();
    expect(items.value).toHaveLength(1);
    expect(count.value).toBe(1);

    await reset();
    expect(items.value).toHaveLength(1);
    expect(items.value[0].id).toBe("row-A");
  });

  it("sets error on fetch failure", async () => {
    const builder = makeQueryBuilder([
      { data: null, error: new Error("network down") },
    ]);

    const { loadMore, error } = useCursorPagination(
      builder as any,
      "occurred_at",
      20,
    );
    await loadMore();

    expect(error.value).toBe("network down");
  });

  it("hasMore is false when no data returned", async () => {
    const builder = makeQueryBuilder([{ data: [], error: null }]);

    const { loadMore, hasMore } = useCursorPagination(
      builder as any,
      "occurred_at",
      20,
    );
    await loadMore();

    expect(hasMore.value).toBe(false);
  });

  it("uses gt operator in ascending mode", async () => {
    const builder = makeQueryBuilder([
      {
        data: [
          { id: "r1", ts: "2026-01-01" },
          { id: "r2", ts: "2026-01-02" },
        ],
        error: null,
      },
      {
        data: [{ id: "r3", ts: "2026-01-03" }],
        error: null,
      },
    ]);

    const { loadMore } = useCursorPagination(
      builder as any,
      "ts",
      1,
      "asc",
    );

    await loadMore();
    await loadMore();

    const orFilter = (builder.or as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(orFilter).toContain("ts.gt.");
    expect(orFilter).toContain("id.gt.");
  });

  it("is a no-op while already loading (prevents double-fetch)", async () => {
    let resolveQuery!: (v: unknown) => void;
    const slowBuilder: Record<string, unknown> = {
      select: vi.fn(() => slowBuilder),
      limit: vi.fn(() => slowBuilder),
      or: vi.fn(() => slowBuilder),
      order: vi.fn(() => slowBuilder),
      then: (resolve: (v: unknown) => unknown) => {
        // `await thenable` calls `.then(resolve, reject)` — we intercept
        // resolve so the caller stays suspended until we release it.
        return new Promise<void>((r) => {
          resolveQuery = (val) => {
            resolve(val);
            r();
          };
        });
      },
    };

    const { loadMore, loading } = useCursorPagination(
      slowBuilder as any,
      "ts",
      20,
    );

    const first = loadMore();
    // Yield a microtask so loadMore reaches the `await query` and `.then` fires
    await new Promise((r) => setTimeout(r, 0));
    expect(loading.value).toBe(true);

    // Second call while first is in-flight should be a no-op
    const second = loadMore();

    resolveQuery({ data: [{ id: "r1", ts: "2026-01-01" }], error: null });
    await first;
    await second;

    // select called only once (not twice)
    expect(slowBuilder.select).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when hasMore is already false", async () => {
    const builder = makeQueryBuilder([
      { data: [], error: null },
      { data: [{ id: "nope", ts: "2026-01-01" }], error: null },
    ]);

    const { loadMore, hasMore, items } = useCursorPagination(
      builder as any,
      "ts",
      20,
    );

    await loadMore(); // empty → hasMore=false
    expect(hasMore.value).toBe(false);

    await loadMore(); // should be a no-op
    expect(items.value).toHaveLength(0);
    expect(builder.select).toHaveBeenCalledTimes(1);
  });

  it("handles null data the same as empty data", async () => {
    const builder = makeQueryBuilder([{ data: null, error: null }]);

    const { loadMore, hasMore, items } = useCursorPagination(
      builder as any,
      "ts",
      20,
    );
    await loadMore();

    expect(hasMore.value).toBe(false);
    expect(items.value).toHaveLength(0);
  });

  it("uses fallback message for non-Error thrown values", async () => {
    const builder = makeQueryBuilder([{ data: null, error: "string-error" }]);

    const { loadMore, error } = useCursorPagination(
      builder as any,
      "ts",
      20,
    );
    await loadMore();

    expect(error.value).toBe("Failed to load paginated results");
  });

  it("appends pages without replacing previous items", async () => {
    const builder = makeQueryBuilder([
      {
        data: [
          { id: "r1", ts: "2026-01-01" },
          { id: "r2", ts: "2026-01-02" },
        ],
        error: null,
      },
      {
        data: [{ id: "r3", ts: "2026-01-03" }],
        error: null,
      },
    ]);

    const { loadMore, items, count } = useCursorPagination(
      builder as any,
      "ts",
      1,
    );

    await loadMore(); // page 1: r1 (r2 popped as overflow)
    expect(items.value).toHaveLength(1);

    await loadMore(); // page 2: r3 appended
    expect(items.value).toHaveLength(2);
    expect(count.value).toBe(2);
    expect(items.value.map((i) => i.id)).toEqual(["r1", "r3"]);
  });

  it("handles numeric cursor values (e.g. sort_order integer)", async () => {
    const builder = makeQueryBuilder([
      {
        data: [
          { id: "a", priority: 10 },
          { id: "b", priority: 5 },
        ],
        error: null,
      },
      {
        data: [{ id: "c", priority: 1 }],
        error: null,
      },
    ]);

    const { loadMore } = useCursorPagination(
      builder as any,
      "priority",
      1,
      "desc",
    );

    await loadMore();
    await loadMore();

    const orFilter = (builder.or as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    // Numeric values should NOT be quoted
    expect(orFilter).toContain("priority.lt.10");
    expect(orFilter).toContain("id.lt.a");
    expect(orFilter).not.toContain('"10"');
  });

  it("quotes string cursor values in the compound filter", async () => {
    const builder = makeQueryBuilder([
      {
        data: [
          { id: "r1", name: "Alpha" },
          { id: "r2", name: "Beta" },
        ],
        error: null,
      },
      {
        data: [{ id: "r3", name: "Gamma" }],
        error: null,
      },
    ]);

    const { loadMore } = useCursorPagination(
      builder as any,
      "name",
      1,
      "asc",
    );

    await loadMore();
    await loadMore();

    const orFilter = (builder.or as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(orFilter).toContain('name.gt."Alpha"');
    expect(orFilter).toContain("id.gt.r1");
  });
});

describe("useTypedCursorPagination", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeSupabase(
    responses: Array<{ data: unknown[] | null; error: unknown }>,
  ) {
    let callIndex = -1;
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      or: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (resolve: (v: unknown) => unknown) => {
        callIndex += 1;
        return Promise.resolve(
          responses[callIndex] ?? { data: [], error: null },
        ).then(resolve);
      },
    };
    return { from: vi.fn(() => builder), _builder: builder };
  }

  it("loads items with typed columns and filters", async () => {
    const supabase = makeSupabase([
      {
        data: [{ id: "i-1", occurred_at: "2026-01-01", type: "email" }],
        error: null,
      },
    ]);

    const { loadMore, items, count } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at, type",
      "occurred_at",
      { family_unit_id: "fam-1" },
      20,
    );

    await loadMore();

    expect(items.value).toHaveLength(1);
    expect(count.value).toBe(1);
    expect(supabase._builder.eq).toHaveBeenCalledWith("family_unit_id", "fam-1");
  });

  it("reset reloads from scratch", async () => {
    const supabase = makeSupabase([
      {
        data: [{ id: "i-1", occurred_at: "2026-01-01" }],
        error: null,
      },
      {
        data: [{ id: "i-2", occurred_at: "2026-02-01" }],
        error: null,
      },
    ]);

    const { loadMore, reset, items } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
    );

    await loadMore();
    expect(items.value).toHaveLength(1);

    await reset();
    expect(items.value).toHaveLength(1);
    expect(items.value[0].id).toBe("i-2");
  });

  it("surfaces error from Supabase query failure", async () => {
    const supabase = makeSupabase([
      { data: null, error: new Error("permission denied") },
    ]);

    const { loadMore, error, loading } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id",
      "occurred_at",
    );

    await loadMore();

    expect(error.value).toBe("permission denied");
    expect(loading.value).toBe(false);
  });

  it("applies multiple filters as separate .eq() calls", async () => {
    const supabase = makeSupabase([
      {
        data: [{ id: "i-1", occurred_at: "2026-01-01" }],
        error: null,
      },
    ]);

    const { loadMore } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
      { family_unit_id: "fam-1", type: "email", active: true },
      20,
    );

    await loadMore();

    expect(supabase._builder.eq).toHaveBeenCalledWith(
      "family_unit_id",
      "fam-1",
    );
    expect(supabase._builder.eq).toHaveBeenCalledWith("type", "email");
    expect(supabase._builder.eq).toHaveBeenCalledWith("active", true);
    expect(supabase._builder.eq).toHaveBeenCalledTimes(3);
  });

  it("works without filters (undefined)", async () => {
    const supabase = makeSupabase([
      {
        data: [{ id: "i-1", occurred_at: "2026-01-01" }],
        error: null,
      },
    ]);

    const { loadMore, items } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
      undefined,
      20,
    );

    await loadMore();

    expect(items.value).toHaveLength(1);
    expect(supabase._builder.eq).not.toHaveBeenCalled();
  });

  it("uses compound cursor filter on second page", async () => {
    const supabase = makeSupabase([
      {
        data: [
          { id: "i-1", occurred_at: "2026-06-01" },
          { id: "i-2", occurred_at: "2026-05-01" },
        ],
        error: null,
      },
      {
        data: [{ id: "i-3", occurred_at: "2026-04-01" }],
        error: null,
      },
    ]);

    const { loadMore } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
      undefined,
      1,
      "desc",
    );

    await loadMore(); // page 1
    await loadMore(); // page 2 — should apply .or() with compound filter

    expect(supabase._builder.or).toHaveBeenCalledTimes(1);
    const orFilter = (supabase._builder.or as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(orFilter).toContain("occurred_at.lt.");
    expect(orFilter).toContain("id.lt.i-1");
  });

  it("ascending order uses gt operator and ascending sort", async () => {
    const supabase = makeSupabase([
      {
        data: [
          { id: "i-1", created_at: "2026-01-01" },
          { id: "i-2", created_at: "2026-01-02" },
        ],
        error: null,
      },
      {
        data: [{ id: "i-3", created_at: "2026-01-03" }],
        error: null,
      },
    ]);

    const { loadMore } = useTypedCursorPagination(
      supabase as any,
      "events",
      "id, created_at",
      "created_at",
      undefined,
      1,
      "asc",
    );

    await loadMore();

    expect(supabase._builder.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: true,
    });
    expect(supabase._builder.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: true,
    });

    await loadMore();

    const orFilter = (supabase._builder.or as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(orFilter).toContain("created_at.gt.");
    expect(orFilter).toContain("id.gt.");
  });

  it("hasMore is false when results fit in one page", async () => {
    const supabase = makeSupabase([
      {
        data: [
          { id: "i-1", occurred_at: "2026-01-01" },
          { id: "i-2", occurred_at: "2026-01-02" },
        ],
        error: null,
      },
    ]);

    const { loadMore, hasMore } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
      undefined,
      5,
    );

    await loadMore();

    // 2 items returned, pageSize=5, so data.length (2) <= pageSize → no more
    expect(hasMore.value).toBe(false);
  });

  it("hasMore is true when overflow row detected, and that row is excluded", async () => {
    const supabase = makeSupabase([
      {
        // pageSize=2, so limit=3; returning 3 means more exist
        data: [
          { id: "i-1", occurred_at: "2026-03-01" },
          { id: "i-2", occurred_at: "2026-02-01" },
          { id: "i-3", occurred_at: "2026-01-01" },
        ],
        error: null,
      },
    ]);

    const { loadMore, hasMore, items } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
      undefined,
      2,
    );

    await loadMore();

    expect(hasMore.value).toBe(true);
    // The overflow row (i-3) should be popped — only 2 items kept
    expect(items.value).toHaveLength(2);
    expect(items.value.map((i) => i.id)).toEqual(["i-1", "i-2"]);
  });

  it("empty result sets hasMore to false", async () => {
    const supabase = makeSupabase([{ data: [], error: null }]);

    const { loadMore, hasMore, items } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id",
      "occurred_at",
    );

    await loadMore();

    expect(hasMore.value).toBe(false);
    expect(items.value).toHaveLength(0);
  });

  it("null data sets hasMore to false", async () => {
    const supabase = makeSupabase([{ data: null, error: null }]);

    const { loadMore, hasMore, items } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id",
      "occurred_at",
    );

    await loadMore();

    expect(hasMore.value).toBe(false);
    expect(items.value).toHaveLength(0);
  });

  it("is a no-op while already loading", async () => {
    let resolveQuery!: (v: unknown) => void;
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      or: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then: (resolve: (v: unknown) => unknown) => {
        return new Promise<void>((r) => {
          resolveQuery = (val) => {
            resolve(val);
            r();
          };
        });
      },
    };
    const supabase = { from: vi.fn(() => builder) };

    const { loadMore, loading } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id",
      "occurred_at",
    );

    const first = loadMore();
    await new Promise((r) => setTimeout(r, 0));
    expect(loading.value).toBe(true);

    const second = loadMore(); // should no-op

    resolveQuery({
      data: [{ id: "i-1", occurred_at: "2026-01-01" }],
      error: null,
    });
    await first;
    await second;

    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when hasMore is already false", async () => {
    const supabase = makeSupabase([
      { data: [], error: null },
      { data: [{ id: "nope", occurred_at: "2026-01-01" }], error: null },
    ]);

    const { loadMore, hasMore, items } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
    );

    await loadMore(); // empty → hasMore=false
    expect(hasMore.value).toBe(false);

    await loadMore(); // should be a no-op
    expect(items.value).toHaveLength(0);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("uses fallback message for non-Error thrown values", async () => {
    const supabase = makeSupabase([
      { data: null, error: "not-an-error-object" },
    ]);

    const { loadMore, error } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id",
      "occurred_at",
    );

    await loadMore();

    expect(error.value).toBe("Failed to load paginated results");
  });

  it("selects the specified columns", async () => {
    const supabase = makeSupabase([
      {
        data: [{ id: "i-1", occurred_at: "2026-01-01", subject: "Hello" }],
        error: null,
      },
    ]);

    const { loadMore } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at, subject",
      "occurred_at",
    );

    await loadMore();

    expect(supabase._builder.select).toHaveBeenCalledWith(
      "id, occurred_at, subject",
    );
  });

  it("queries the specified table", async () => {
    const supabase = makeSupabase([
      { data: [{ id: "e-1", start_date: "2026-06-01" }], error: null },
    ]);

    const { loadMore } = useTypedCursorPagination(
      supabase as any,
      "events",
      "id, start_date",
      "start_date",
    );

    await loadMore();

    expect(supabase.from).toHaveBeenCalledWith("events");
  });

  it("appends pages without replacing previous items", async () => {
    const supabase = makeSupabase([
      {
        data: [
          { id: "i-1", occurred_at: "2026-03-01" },
          { id: "i-2", occurred_at: "2026-02-01" },
        ],
        error: null,
      },
      {
        data: [{ id: "i-3", occurred_at: "2026-01-01" }],
        error: null,
      },
    ]);

    const { loadMore, items, count } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
      undefined,
      1,
    );

    await loadMore(); // page 1: i-1 (i-2 popped)
    expect(items.value).toHaveLength(1);

    await loadMore(); // page 2: i-3 appended
    expect(items.value).toHaveLength(2);
    expect(count.value).toBe(2);
    expect(items.value.map((i) => i.id)).toEqual(["i-1", "i-3"]);
  });

  it("reset clears error state", async () => {
    const supabase = makeSupabase([
      { data: null, error: new Error("temporary failure") },
      { data: [{ id: "i-1", occurred_at: "2026-01-01" }], error: null },
    ]);

    const { loadMore, reset, error, items } = useTypedCursorPagination(
      supabase as any,
      "interactions",
      "id, occurred_at",
      "occurred_at",
    );

    await loadMore();
    expect(error.value).toBe("temporary failure");

    await reset();
    expect(error.value).toBeNull();
    expect(items.value).toHaveLength(1);
  });
});
