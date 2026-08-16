import { describe, it, expect, vi } from "vitest";
import {
  normalizePrefs,
  prefFor,
  getNotificationPrefs,
  DEFAULT_PREF,
} from "~/server/utils/notificationPreferences";

describe("normalizePrefs", () => {
  it("maps rows by type and preserves booleans", () => {
    const map = normalizePrefs([
      { notification_type: "deadline_alert", push_enabled: true, email_enabled: false },
      { notification_type: "event", push_enabled: false, email_enabled: false },
    ]);
    expect(map.get("deadline_alert")).toEqual({
      push_enabled: true,
      email_enabled: false,
    });
    expect(map.get("event")).toEqual({
      push_enabled: false,
      email_enabled: false,
    });
  });

  it("falls back to enabled when a column is null", () => {
    const map = normalizePrefs([
      { notification_type: "weekly_digest", push_enabled: null, email_enabled: null },
    ]);
    expect(map.get("weekly_digest")).toEqual(DEFAULT_PREF);
  });
});

describe("prefFor", () => {
  it("returns enabled-by-default for an unset type", () => {
    expect(prefFor(new Map(), "follow_up_reminder")).toEqual({
      push_enabled: true,
      email_enabled: true,
    });
  });

  it("returns the stored pref when present", () => {
    const map = new Map([
      ["event", { push_enabled: false, email_enabled: true }],
    ]);
    expect(prefFor(map, "event")).toEqual({
      push_enabled: false,
      email_enabled: true,
    });
  });
});

describe("getNotificationPrefs", () => {
  it("fails open (empty map) on query error", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: "boom" } }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const map = await getNotificationPrefs("u-1", supabase);
    expect(map.size).toBe(0);
    // and prefFor still yields enabled defaults
    expect(prefFor(map, "deadline_alert")).toEqual(DEFAULT_PREF);
  });

  it("returns normalized prefs on success", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                notification_type: "deadline_alert",
                push_enabled: false,
                email_enabled: true,
              },
            ],
            error: null,
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const map = await getNotificationPrefs("u-1", supabase);
    expect(prefFor(map, "deadline_alert")).toEqual({
      push_enabled: false,
      email_enabled: true,
    });
  });
});
