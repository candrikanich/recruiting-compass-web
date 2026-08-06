import { describe, it, expect } from "vitest";
import { isNotificationRead } from "~/types/models";
import type { Notification } from "~/types/models";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    user_id: "u1",
    type: "info",
    title: "Test",
    message: "Test message",
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as Notification;
}

describe("types/models isNotificationRead", () => {
  it("returns false when read_at is null", () => {
    expect(isNotificationRead(makeNotification({ read_at: null }))).toBe(false);
  });

  it("returns true when read_at is set", () => {
    expect(
      isNotificationRead(
        makeNotification({ read_at: new Date().toISOString() }),
      ),
    ).toBe(true);
  });
});
