import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("~/server/utils/recurringEmail", () => ({
  sendRecurringEmail: vi.fn(),
}));

vi.mock("~/server/utils/notificationPreferences", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getNotificationPrefs: vi.fn(),
  };
});

vi.mock("~/server/utils/notificationGenerator", () => ({
  generateOfferNotifications: vi.fn(),
  generateRecommendationNotifications: vi.fn(),
  generateEventNotifications: vi.fn(),
  generateCoachFollowupNotifications: vi.fn(),
  generateUserDeadlineNotifications: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Top-level await: import mocked modules once
const {
  selectDeadlineEmails,
  fetchDeadlineItems,
  sendDeadlineAlertEmails,
  deliverNotificationsForUser,
  DEADLINE_EMAIL_MILESTONES,
} = await import("~/server/utils/notificationDelivery");
import type { DeadlineItem } from "~/server/utils/notificationDelivery";

const { sendRecurringEmail } = await import("~/server/utils/recurringEmail");
const mockSendRecurringEmail = sendRecurringEmail as Mock;

const { getNotificationPrefs } = await import(
  "~/server/utils/notificationPreferences"
);
const mockGetPrefs = getNotificationPrefs as Mock;

const {
  generateOfferNotifications,
  generateRecommendationNotifications,
  generateEventNotifications,
  generateCoachFollowupNotifications,
  generateUserDeadlineNotifications,
} = await import("~/server/utils/notificationGenerator");
const mockOffers = generateOfferNotifications as Mock;
const mockRecs = generateRecommendationNotifications as Mock;
const mockEvents = generateEventNotifications as Mock;
const mockFollowups = generateCoachFollowupNotifications as Mock;
const mockUserDeadlines = generateUserDeadlineNotifications as Mock;

const now = new Date("2026-08-16T12:00:00.000Z");

function daysOut(n: number): string {
  return new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
}

const base: Omit<DeadlineItem, "deadlineDate"> = {
  entityId: "e-1",
  entityType: "offer",
  label: "Offer from State U",
};

describe("selectDeadlineEmails", () => {
  it("selects deadlines sitting exactly on a milestone", () => {
    const items: DeadlineItem[] = DEADLINE_EMAIL_MILESTONES.map((m, i) => ({
      ...base,
      entityId: `e-${i}`,
      deadlineDate: daysOut(m),
    }));
    const result = selectDeadlineEmails(items, now);
    expect(result.map((r) => r.daysUntil).sort((a, b) => a - b)).toEqual([
      1, 3, 7, 14,
    ]);
  });

  it("ignores deadlines between milestones (no daily spam)", () => {
    const items: DeadlineItem[] = [10, 5, 2].map((m, i) => ({
      ...base,
      entityId: `e-${i}`,
      deadlineDate: daysOut(m),
    }));
    expect(selectDeadlineEmails(items, now)).toHaveLength(0);
  });

  it("ignores past-due deadlines", () => {
    const items: DeadlineItem[] = [{ ...base, deadlineDate: daysOut(-3) }];
    expect(selectDeadlineEmails(items, now)).toHaveLength(0);
  });

  it("carries entity metadata through for idempotency keys", () => {
    const items: DeadlineItem[] = [
      {
        entityId: "off-9",
        entityType: "offer",
        label: "Offer from State U",
        deadlineDate: daysOut(7),
      },
    ];
    const [row] = selectDeadlineEmails(items, now);
    expect(row).toMatchObject({
      entityId: "off-9",
      entityType: "offer",
      daysUntil: 7,
    });
  });

  it("selects user_deadline items at milestone days", () => {
    const items: DeadlineItem[] = [
      {
        entityId: "ud1",
        entityType: "user_deadline",
        label: "Stanford App",
        deadlineDate: "2026-10-16", // 14 days from "now"
      },
    ];
    const result = selectDeadlineEmails(items, new Date("2026-10-02"));
    expect(result).toHaveLength(1);
    expect(result[0].daysUntil).toBe(14);
  });
});

describe("fetchDeadlineItems with user_deadlines", () => {
  function buildChain(data: unknown[] | null) {
    const chain: Record<string, unknown> = {};
    const passthrough = () => chain;
    chain.select = vi.fn(passthrough);
    chain.eq = vi.fn(passthrough);
    chain.in = vi.fn(passthrough);
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data, error: null });
    return chain;
  }

  it("includes user_deadlines in the returned items", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "offers") return buildChain([]);
      if (table === "recommendation_letters") return buildChain([]);
      if (table === "user_deadlines")
        return buildChain([
          {
            id: "ud-1",
            label: "Stanford App",
            deadline_date: "2026-10-16",
          },
        ]);
      return buildChain([]);
    });
    const supabase = { from: fromMock } as unknown as SupabaseClient;

    const items = await fetchDeadlineItems("u-1", supabase);

    expect(items).toContainEqual({
      entityId: "ud-1",
      entityType: "user_deadline",
      label: "Stanford App",
      deadlineDate: "2026-10-16",
    });
  });
});

describe("sendDeadlineAlertEmails", () => {
  const supabase = {} as SupabaseClient;

  function buildChain(data: unknown[] | null) {
    const chain: Record<string, unknown> = {};
    const passthrough = () => chain;
    chain.select = vi.fn(passthrough);
    chain.eq = vi.fn(passthrough);
    chain.in = vi.fn(passthrough);
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data, error: null });
    return chain;
  }

  function mockSupabaseWithItems(items: {
    offers?: unknown[];
    recs?: unknown[];
    userDeadlines?: unknown[];
    schools?: unknown[];
  }) {
    const fromMock = vi.fn((table: string) => {
      if (table === "offers") return buildChain(items.offers ?? []);
      if (table === "recommendation_letters")
        return buildChain(items.recs ?? []);
      if (table === "user_deadlines")
        return buildChain(items.userDeadlines ?? []);
      if (table === "schools") return buildChain(items.schools ?? []);
      return buildChain([]);
    });
    return { from: fromMock } as unknown as SupabaseClient;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends emails for deadlines hitting a milestone", async () => {
    const sb = mockSupabaseWithItems({
      offers: [
        { id: "off-1", school_id: "s-1", deadline_date: daysOut(7) },
      ],
      schools: [{ id: "s-1", name: "State U" }],
    });
    mockSendRecurringEmail.mockResolvedValue({
      success: true,
      skipped: false,
    });

    const sent = await sendDeadlineAlertEmails(
      "u-1",
      "test@example.com",
      sb,
      "secret",
      now,
    );

    expect(sent).toBe(1);
    expect(mockSendRecurringEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Deadline in 7 days: Offer from State U",
        template: "deadline-alert",
        idempotencyKey: "deadline-offer-off-1-7",
        unsubscribeSecret: "secret",
      }),
    );
  });

  it("uses '1 day' urgency label for 1-day milestone", async () => {
    const sb = mockSupabaseWithItems({
      userDeadlines: [
        { id: "ud-1", label: "Stanford App", deadline_date: daysOut(1) },
      ],
    });
    mockSendRecurringEmail.mockResolvedValue({
      success: true,
      skipped: false,
    });

    await sendDeadlineAlertEmails(
      "u-1",
      "test@example.com",
      sb,
      "secret",
      now,
    );

    expect(mockSendRecurringEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Deadline in 1 day: Stanford App",
      }),
    );
  });

  it("returns 0 when no deadlines hit a milestone", async () => {
    const sb = mockSupabaseWithItems({
      offers: [
        { id: "off-1", school_id: "s-1", deadline_date: daysOut(10) },
      ],
      schools: [{ id: "s-1", name: "X" }],
    });

    const sent = await sendDeadlineAlertEmails(
      "u-1",
      "test@example.com",
      sb,
      "secret",
      now,
    );

    expect(sent).toBe(0);
    expect(mockSendRecurringEmail).not.toHaveBeenCalled();
  });

  it("does not count skipped (idempotent) sends", async () => {
    const sb = mockSupabaseWithItems({
      offers: [
        { id: "off-1", school_id: "s-1", deadline_date: daysOut(7) },
      ],
      schools: [{ id: "s-1", name: "X" }],
    });
    mockSendRecurringEmail.mockResolvedValue({
      success: true,
      skipped: true,
    });

    const sent = await sendDeadlineAlertEmails(
      "u-1",
      "test@example.com",
      sb,
      "secret",
      now,
    );

    expect(sent).toBe(0);
  });
});

describe("deliverNotificationsForUser", () => {
  const supabase = {} as SupabaseClient;

  function allPrefsEnabled() {
    const prefs = new Map();
    prefs.set("follow_up_reminder", {
      push_enabled: true,
      email_enabled: true,
    });
    prefs.set("deadline_alert", {
      push_enabled: true,
      email_enabled: true,
    });
    prefs.set("event", { push_enabled: true, email_enabled: true });
    return prefs;
  }

  function allPrefsDisabled() {
    const prefs = new Map();
    prefs.set("follow_up_reminder", {
      push_enabled: false,
      email_enabled: false,
    });
    prefs.set("deadline_alert", {
      push_enabled: false,
      email_enabled: false,
    });
    prefs.set("event", { push_enabled: false, email_enabled: false });
    return prefs;
  }

  function buildChain(data: unknown[] | null) {
    const chain: Record<string, unknown> = {};
    const passthrough = () => chain;
    chain.select = vi.fn(passthrough);
    chain.eq = vi.fn(passthrough);
    chain.in = vi.fn(passthrough);
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data, error: null });
    return chain;
  }

  function emptySupabase() {
    return {
      from: vi.fn(() => buildChain([])),
    } as unknown as SupabaseClient;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockOffers.mockResolvedValue({ count: 0 });
    mockRecs.mockResolvedValue({ count: 0 });
    mockEvents.mockResolvedValue({ count: 0 });
    mockFollowups.mockResolvedValue({ count: 0 });
    mockUserDeadlines.mockResolvedValue({ count: 0 });
  });

  it("calls generators when their pref channel is enabled", async () => {
    mockGetPrefs.mockResolvedValue(allPrefsEnabled());
    mockFollowups.mockResolvedValue({ count: 2 });
    mockOffers.mockResolvedValue({ count: 1 });

    const result = await deliverNotificationsForUser(
      "u-1",
      "test@example.com",
      emptySupabase(),
      "secret",
      now,
    );

    expect(result.inApp).toBe(3);
    expect(mockFollowups).toHaveBeenCalled();
    expect(mockOffers).toHaveBeenCalled();
    expect(mockRecs).toHaveBeenCalled();
    expect(mockUserDeadlines).toHaveBeenCalled();
    expect(mockEvents).toHaveBeenCalled();
  });

  it("skips generators when prefs are disabled", async () => {
    mockGetPrefs.mockResolvedValue(allPrefsDisabled());

    const result = await deliverNotificationsForUser(
      "u-1",
      "test@example.com",
      supabase,
      "secret",
      now,
    );

    expect(result.inApp).toBe(0);
    expect(result.emails).toBe(0);
    expect(mockFollowups).not.toHaveBeenCalled();
    expect(mockOffers).not.toHaveBeenCalled();
    expect(mockEvents).not.toHaveBeenCalled();
  });

  it("skips email when email_enabled is false", async () => {
    const prefs = allPrefsEnabled();
    prefs.set("deadline_alert", {
      push_enabled: true,
      email_enabled: false,
    });
    mockGetPrefs.mockResolvedValue(prefs);

    const result = await deliverNotificationsForUser(
      "u-1",
      "test@example.com",
      emptySupabase(),
      "secret",
      now,
    );

    expect(result.emails).toBe(0);
    expect(mockSendRecurringEmail).not.toHaveBeenCalled();
  });

  it("skips email when email is null", async () => {
    mockGetPrefs.mockResolvedValue(allPrefsEnabled());

    const result = await deliverNotificationsForUser(
      "u-1",
      null,
      emptySupabase(),
      "secret",
      now,
    );

    expect(result.emails).toBe(0);
    expect(mockSendRecurringEmail).not.toHaveBeenCalled();
  });

  it("swallows email errors gracefully", async () => {
    mockGetPrefs.mockResolvedValue(allPrefsEnabled());
    // sendDeadlineAlertEmails calls fetchDeadlineItems internally — make the
    // real Supabase mock throw so the email path errors out
    const badSupabase = {
      from: vi.fn(() => {
        throw new Error("DB down");
      }),
    } as unknown as SupabaseClient;

    const result = await deliverNotificationsForUser(
      "u-1",
      "test@example.com",
      badSupabase,
      "secret",
      now,
    );

    expect(result.emails).toBe(0);
  });
});
