import { describe, it, expect, beforeEach, vi } from "vitest";
import { useActivityFeed } from "~/composables/useActivityFeed";

// Mutable mocks the test can adjust per case.
const mockUserState: { user: { id: string } | null } = {
  user: { id: "user-abc" },
};

type TableResult = { data: unknown; error: unknown };
const tableResults: Record<string, TableResult> = {
  interactions: { data: [], error: null },
  school_status_history: { data: [], error: null },
  documents: { data: [], error: null },
  schools: { data: null, error: null },
};

const channelHandlers: Array<{
  filter: Record<string, unknown>;
  handler: (payload: { new: unknown }) => Promise<void> | void;
}> = [];
const channelUnsubscribe = vi.fn();
const channelSubscribe = vi.fn();
const channelOn = vi.fn(function on(
  this: unknown,
  _event: string,
  filter: Record<string, unknown>,
  handler: (payload: { new: unknown }) => Promise<void> | void,
) {
  channelHandlers.push({ filter, handler });
  return channelMock;
});
const channelMock = {
  on: channelOn,
  subscribe: channelSubscribe,
  unsubscribe: channelUnsubscribe,
};
const channelFactory = vi.fn(() => channelMock);

// Builder mocks the Supabase fluent chain. Terminal awaited calls
// for list reads are .limit(50); for the single-row school lookup
// in subscriptions the terminal is .single().
function buildBuilder(table: string) {
  const result = tableResults[table] ?? { data: [], error: null };
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn().mockResolvedValue(result);
  builder.single = vi.fn().mockResolvedValue(result);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  return builder;
}

const fromSpy = vi.fn((table: string) => buildBuilder(table));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    from: fromSpy,
    channel: channelFactory,
  }),
}));

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

function resetTables() {
  tableResults.interactions = { data: [], error: null };
  tableResults.school_status_history = { data: [], error: null };
  tableResults.documents = { data: [], error: null };
  tableResults.schools = { data: null, error: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserState.user = { id: "user-abc" };
  resetTables();
  channelHandlers.length = 0;
});

describe("useActivityFeed — fetch branches", () => {
  it("maps interaction rows into ActivityEvents with school name", async () => {
    tableResults.interactions = {
      data: [
        {
          id: "int-1",
          school_id: "sch-1",
          type: "email",
          content: "Coach reached out about visit dates",
          subject: null,
          occurred_at: "2026-05-20T12:00:00Z",
          created_at: "2026-05-20T12:00:00Z",
          schools: { id: "sch-1", name: "State University" },
        },
      ],
      error: null,
    };
    const feed = useActivityFeed();
    await feed.fetchActivities();
    const events = feed.activities.value;
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("interaction-int-1");
    expect(events[0].type).toBe("interaction");
    expect(events[0].icon).toBe("📧");
    expect(events[0].title).toContain("State University");
    expect(events[0].clickUrl).toBe("/interactions?id=int-1");
    expect(events[0].metadata).toHaveProperty("relativeTime");
  });

  it("falls back to subject when content is missing, and truncates long values", async () => {
    const longSubject = "x".repeat(80);
    tableResults.interactions = {
      data: [
        {
          id: "int-long",
          school_id: "sch-2",
          type: "phone_call",
          content: null,
          subject: longSubject,
          occurred_at: null,
          created_at: "2026-05-20T12:00:00Z",
          schools: [{ id: "sch-2", name: "Tech University" }],
        },
      ],
      error: null,
    };
    const feed = useActivityFeed();
    await feed.fetchActivities();
    const event = feed.activities.value[0];
    expect(event.description.endsWith("...")).toBe(true);
    expect(event.description.length).toBeLessThanOrEqual(53);
    expect(event.title).toContain("Tech University");
  });

  it("uses 'No additional details' when both content and subject are missing", async () => {
    tableResults.interactions = {
      data: [
        {
          id: "int-empty",
          school_id: "sch-3",
          type: "other",
          content: null,
          subject: null,
          occurred_at: null,
          created_at: "2026-05-20T12:00:00Z",
          schools: null,
        },
      ],
      error: null,
    };
    const feed = useActivityFeed();
    await feed.fetchActivities();
    const event = feed.activities.value[0];
    expect(event.description).toBe("No additional details");
    expect(event.title).toContain("Unknown School");
  });

  it("logs and skips interactions when supabase returns an error", async () => {
    tableResults.interactions = {
      data: null,
      error: { message: "boom" },
    };
    const feed = useActivityFeed();
    await feed.fetchActivities();
    expect(feed.activities.value).toEqual([]);
    expect(feed.error.value).toBeNull();
  });

  it("maps school status changes including notes fallback", async () => {
    tableResults.school_status_history = {
      data: [
        {
          id: "st-1",
          school_id: "sch-9",
          new_status: "actively_recruiting",
          notes: null,
          changed_at: "2026-05-21T09:00:00Z",
          schools: { id: "sch-9", name: "Coastal U" },
        },
      ],
      error: null,
    };
    const feed = useActivityFeed();
    await feed.fetchActivities();
    const event = feed.activities.value.find((e) =>
      e.id.startsWith("status-"),
    )!;
    expect(event).toBeDefined();
    expect(event.title).toContain("Coastal U");
    expect(event.title).toContain("actively recruiting");
    expect(event.description).toBe("No additional notes");
    expect(event.clickUrl).toBe("/schools/sch-9");
  });

  it("logs and skips status changes when supabase returns an error", async () => {
    tableResults.school_status_history = {
      data: null,
      error: { message: "nope" },
    };
    const feed = useActivityFeed();
    await feed.fetchActivities();
    expect(
      feed.activities.value.find((e) => e.id.startsWith("status-")),
    ).toBeUndefined();
  });

  it("maps document uploads", async () => {
    tableResults.documents = {
      data: [
        {
          id: "doc-1",
          title: "Highlight Reel 2026",
          type: "highlight_video",
          created_at: "2026-05-22T10:00:00Z",
        },
      ],
      error: null,
    };
    const feed = useActivityFeed();
    await feed.fetchActivities();
    const event = feed.activities.value.find((e) => e.id === "doc-doc-1")!;
    expect(event).toBeDefined();
    expect(event.icon).toBe("📄");
    expect(event.clickable).toBe(false);
    expect(event.title).toBe("Uploaded highlight video");
  });

  it("sorts merged events by timestamp descending and applies offset/limit", async () => {
    tableResults.interactions = {
      data: [
        {
          id: "old",
          school_id: "sch-1",
          type: "email",
          content: "old",
          subject: null,
          occurred_at: "2026-05-01T00:00:00Z",
          created_at: "2026-05-01T00:00:00Z",
          schools: { id: "sch-1", name: "A" },
        },
        {
          id: "new",
          school_id: "sch-1",
          type: "email",
          content: "new",
          subject: null,
          occurred_at: "2026-05-23T00:00:00Z",
          created_at: "2026-05-23T00:00:00Z",
          schools: { id: "sch-1", name: "A" },
        },
      ],
      error: null,
    };
    tableResults.documents = {
      data: [
        {
          id: "doc-mid",
          title: "Transcript",
          type: "transcript",
          created_at: "2026-05-10T00:00:00Z",
        },
      ],
      error: null,
    };
    const feed = useActivityFeed();
    await feed.fetchActivities({ limit: 2, offset: 0 });
    const ids = feed.activities.value.map((e) => e.id);
    expect(ids).toEqual(["interaction-new", "doc-doc-mid"]);

    await feed.fetchActivities({ limit: 2, offset: 1 });
    const idsOffset = feed.activities.value.map((e) => e.id);
    expect(idsOffset).toEqual(["doc-doc-mid", "interaction-old"]);
  });

  it("sets error state when supabase.from throws synchronously", async () => {
    fromSpy.mockImplementationOnce(() => {
      throw new Error("connection refused");
    });
    const feed = useActivityFeed();
    await feed.fetchActivities();
    expect(feed.error.value).toBe("connection refused");
    expect(feed.activities.value).toEqual([]);
    expect(feed.loading.value).toBe(false);
  });

  it("uses fallback error message when thrown value is not an Error", async () => {
    fromSpy.mockImplementationOnce(() => {
      throw "string failure";
    });
    const feed = useActivityFeed();
    await feed.fetchActivities();
    expect(feed.error.value).toBe("Failed to fetch activities");
  });

  it("returns early without setting loading when there is no user", async () => {
    mockUserState.user = null;
    const feed = useActivityFeed();
    await feed.fetchActivities();
    expect(fromSpy).not.toHaveBeenCalled();
    expect(feed.loading.value).toBe(false);
  });
});

describe("useActivityFeed — formatRelativeTime", () => {
  it("returns absolute date for events older than a week", () => {
    const { formatRelativeTime } = useActivityFeed();
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(tenDaysAgo.toISOString());
    expect(result).not.toContain("ago");
    expect(result).toMatch(/[A-Za-z]+ \d+/);
  });
});

describe("useActivityFeed — subscribeToUpdates", () => {
  it("does nothing when there is no user", async () => {
    mockUserState.user = null;
    const feed = useActivityFeed();
    await feed.subscribeToUpdates();
    expect(channelFactory).not.toHaveBeenCalled();
  });

  it("opens a channel, registers three handlers, and subscribes", async () => {
    const feed = useActivityFeed();
    await feed.subscribeToUpdates();
    expect(channelFactory).toHaveBeenCalledWith("activity-feed");
    expect(channelOn).toHaveBeenCalledTimes(3);
    expect(channelSubscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes any existing channel before opening a new one", async () => {
    const feed = useActivityFeed();
    await feed.subscribeToUpdates();
    await feed.subscribeToUpdates();
    expect(channelUnsubscribe).toHaveBeenCalledTimes(1);
    expect(channelFactory).toHaveBeenCalledTimes(2);
  });

  it("prepends a new interaction event when the realtime handler fires", async () => {
    tableResults.schools = {
      data: { id: "sch-x", name: "Realtime U" },
      error: null,
    };
    const feed = useActivityFeed();
    await feed.subscribeToUpdates();
    const interactionHandler = channelHandlers[0]?.handler;
    expect(interactionHandler).toBeDefined();
    await interactionHandler!({
      new: {
        id: "rt-1",
        school_id: "sch-x",
        type: "text",
        content: "yo",
        subject: null,
        occurred_at: "2026-05-25T01:00:00Z",
        created_at: "2026-05-25T01:00:00Z",
      },
    });
    expect(feed.activities.value[0].id).toBe("interaction-rt-1");
    expect(feed.activities.value[0].entityName).toBe("Realtime U");
  });

  it("prepends a status change event when its handler fires", async () => {
    tableResults.schools = {
      data: { id: "sch-y", name: "Status U" },
      error: null,
    };
    const feed = useActivityFeed();
    await feed.subscribeToUpdates();
    const statusHandler = channelHandlers[1]?.handler;
    await statusHandler!({
      new: {
        id: "rt-st",
        school_id: "sch-y",
        new_status: "committed",
        notes: "Signed today",
        changed_at: "2026-05-25T02:00:00Z",
      },
    });
    expect(feed.activities.value[0].id).toBe("status-rt-st");
    expect(feed.activities.value[0].description).toBe("Signed today");
  });

  it("prepends a document upload event when its handler fires", async () => {
    const feed = useActivityFeed();
    await feed.subscribeToUpdates();
    const docHandler = channelHandlers[2]?.handler;
    await docHandler!({
      new: {
        id: "rt-doc",
        title: "Game Film",
        type: "highlight_video",
        created_at: "2026-05-25T03:00:00Z",
      },
    });
    const event = feed.activities.value[0];
    expect(event.id).toBe("doc-rt-doc");
    expect(event.icon).toBe("📄");
    expect(event.title).toBe("Uploaded highlight video");
  });

  it("logs (does not throw) when channel creation throws", async () => {
    channelFactory.mockImplementationOnce(() => {
      throw new Error("channel boom");
    });
    const feed = useActivityFeed();
    await expect(feed.subscribeToUpdates()).resolves.toBeUndefined();
  });
});
