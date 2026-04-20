import { describe, it, expect } from "vitest";
import {
  getNotificationRoute,
  formatNotificationMessage,
  getPriorityColor,
  getNotificationEmoji,
} from "~/utils/notificationHelpers";
import type { Notification } from "~/types/models";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    type: "general",
    title: "Test",
    message: "Test message",
    scheduled_for: "2026-01-01T00:00:00Z",
    priority: "normal",
    ...overrides,
  };
}

describe("getNotificationRoute", () => {
  it("returns offer route with highlight param", () => {
    const n = makeNotification({
      related_entity_type: "offer",
      related_entity_id: "offer-42",
    });
    expect(getNotificationRoute(n)).toBe("/offers?highlight=offer-42");
  });

  it("returns event route with entity id", () => {
    const n = makeNotification({
      related_entity_type: "event",
      related_entity_id: "evt-7",
    });
    expect(getNotificationRoute(n)).toBe("/events/evt-7");
  });

  it("returns recommendation route without entity id", () => {
    const n = makeNotification({ related_entity_type: "recommendation" });
    expect(getNotificationRoute(n)).toBe("/documents?type=recommendation");
  });

  it("returns coach route with highlight param", () => {
    const n = makeNotification({
      related_entity_type: "coach",
      related_entity_id: "coach-9",
    });
    expect(getNotificationRoute(n)).toBe("/coaches?highlight=coach-9");
  });

  it("returns school route with entity id", () => {
    const n = makeNotification({
      related_entity_type: "school",
      related_entity_id: "school-3",
    });
    expect(getNotificationRoute(n)).toBe("/schools/school-3");
  });

  it("returns default notifications route for unknown type", () => {
    const n = makeNotification({ related_entity_type: null });
    expect(getNotificationRoute(n)).toBe("/notifications");
  });

  it("returns default notifications route when related_entity_type is undefined", () => {
    const n = makeNotification({ related_entity_type: undefined });
    expect(getNotificationRoute(n)).toBe("/notifications");
  });

  it("returns default notifications route for interaction type", () => {
    const n = makeNotification({ related_entity_type: "interaction" });
    expect(getNotificationRoute(n)).toBe("/notifications");
  });
});

describe("formatNotificationMessage", () => {
  it("returns the message field directly", () => {
    const n = makeNotification({ message: "Coach Johnson wants to connect" });
    expect(formatNotificationMessage(n)).toBe("Coach Johnson wants to connect");
  });

  it("returns empty string when message is empty", () => {
    const n = makeNotification({ message: "" });
    expect(formatNotificationMessage(n)).toBe("");
  });
});

describe("getPriorityColor", () => {
  it("returns red class for high priority", () => {
    expect(getPriorityColor("high")).toBe("text-red-600");
  });

  it("returns blue class for normal priority", () => {
    expect(getPriorityColor("normal")).toBe("text-blue-600");
  });

  it("returns gray class for low priority", () => {
    expect(getPriorityColor("low")).toBe("text-gray-600");
  });

  it("returns gray class for undefined priority", () => {
    expect(getPriorityColor(undefined)).toBe("text-gray-600");
  });

  it("returns gray class for unknown priority string", () => {
    expect(getPriorityColor("urgent")).toBe("text-gray-600");
  });
});

describe("getNotificationEmoji", () => {
  it("returns bell emoji for follow_up", () => {
    expect(getNotificationEmoji("follow_up")).toBe("🔔");
  });

  it("returns clock emoji for deadline", () => {
    expect(getNotificationEmoji("deadline")).toBe("⏰");
  });

  it("returns party emoji for offer", () => {
    expect(getNotificationEmoji("offer")).toBe("🎉");
  });

  it("returns calendar emoji for event", () => {
    expect(getNotificationEmoji("event")).toBe("📅");
  });

  it("returns mailbox emoji for general", () => {
    expect(getNotificationEmoji("general")).toBe("📬");
  });

  it("returns default mailbox emoji for unknown type", () => {
    expect(getNotificationEmoji("something_else")).toBe("📬");
  });

  it("returns default mailbox emoji for empty string", () => {
    expect(getNotificationEmoji("")).toBe("📬");
  });
});
