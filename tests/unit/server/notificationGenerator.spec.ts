import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase. Notification dedupe-check + insert now route through
// family_notification_exists / insert_family_notification RPCs (#912),
// not raw table access.
const mockFrom = vi.fn();
const mockExisting = { value: false };
const mockRpc = vi.fn((fn: string) => {
  if (fn === "family_notification_exists") {
    return Promise.resolve({ data: mockExisting.value, error: null });
  }
  if (fn === "insert_family_notification") {
    return Promise.resolve({ data: "notif-id", error: null });
  }
  throw new Error(`unexpected rpc ${fn}`);
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

function makeChain(data: unknown[] | null = [], error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data?.[0] ?? null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: data?.[0] ?? null, error }),
    then: (resolve: (v: unknown) => void) => resolve({ data, error }),
  };
}

describe("generateCoachFollowupNotifications — per-coach threshold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockExisting.value = false;
  });

  it("fires notification when days since contact exceeds per-coach threshold of 14", async () => {
    const lastContact = new Date();
    lastContact.setDate(lastContact.getDate() - 15); // 15 days ago

    mockFrom.mockImplementation((table: string) => {
      if (table === "coaches") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) =>
            resolve({
              data: [
                {
                  id: "coach-1",
                  first_name: "Jane",
                  last_name: "Smith",
                  last_contact_date: lastContact.toISOString(),
                  follow_up_threshold_days: 14,
                },
              ],
              error: null,
            }),
        };
      }
      return makeChain([]);
    });

    const { generateCoachFollowupNotifications } =
      await import("~/server/utils/notificationGenerator");
    const result = await generateCoachFollowupNotifications("user-1", {
      from: mockFrom,
      rpc: mockRpc,
    } as never);

    expect(result.count).toBe(1);
    expect(mockRpc).toHaveBeenCalledWith(
      "insert_family_notification",
      expect.objectContaining({ p_related_entity_id: "coach-1" }),
    );
  });

  it("does NOT fire when days since contact is within threshold", async () => {
    const lastContact = new Date();
    lastContact.setDate(lastContact.getDate() - 5); // 5 days ago, within 21-day default

    mockFrom.mockImplementation((table: string) => {
      if (table === "coaches") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) =>
            resolve({
              data: [
                {
                  id: "coach-2",
                  first_name: "Bob",
                  last_name: "Jones",
                  last_contact_date: lastContact.toISOString(),
                  follow_up_threshold_days: null, // use default 21
                },
              ],
              error: null,
            }),
        };
      }
      return makeChain([]);
    });

    const { generateCoachFollowupNotifications } =
      await import("~/server/utils/notificationGenerator");
    const result = await generateCoachFollowupNotifications("user-1", {
      from: mockFrom,
      rpc: mockRpc,
    } as never);

    expect(result.count).toBe(0);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does NOT fire when days since contact is within a custom per-coach threshold", async () => {
    // 10 days ago — old hardcoded 7-day threshold would fire, new 14-day threshold should NOT
    const lastContact = new Date();
    lastContact.setDate(lastContact.getDate() - 10);

    mockFrom.mockImplementation((table: string) => {
      if (table === "coaches") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) =>
            resolve({
              data: [
                {
                  id: "coach-4",
                  first_name: "Tom",
                  last_name: "Hanks",
                  last_contact_date: lastContact.toISOString(),
                  follow_up_threshold_days: 14, // 10 days is within 14-day threshold
                },
              ],
              error: null,
            }),
        };
      }
      return makeChain([]);
    });

    const { generateCoachFollowupNotifications } =
      await import("~/server/utils/notificationGenerator");
    const result = await generateCoachFollowupNotifications("user-1", {
      from: mockFrom,
      rpc: mockRpc,
    } as never);

    expect(result.count).toBe(0);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("uses default 21 days when follow_up_threshold_days is null", async () => {
    const lastContact = new Date();
    lastContact.setDate(lastContact.getDate() - 22); // 22 days, over 21-day default

    mockFrom.mockImplementation((table: string) => {
      if (table === "coaches") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => void) =>
            resolve({
              data: [
                {
                  id: "coach-3",
                  first_name: "Alice",
                  last_name: "Wong",
                  last_contact_date: lastContact.toISOString(),
                  follow_up_threshold_days: null,
                },
              ],
              error: null,
            }),
        };
      }
      return makeChain([]);
    });

    const { generateCoachFollowupNotifications } =
      await import("~/server/utils/notificationGenerator");
    const result = await generateCoachFollowupNotifications("user-1", {
      from: mockFrom,
      rpc: mockRpc,
    } as never);

    expect(result.count).toBe(1);
  });
});
