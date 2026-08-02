import { describe, it, expect, beforeEach } from "vitest";
import { eventFollowUpRule } from "~/server/utils/rules/eventFollowUp";
import type { RuleContext } from "~/server/utils/rules/index";

describe("eventFollowUpRule", () => {
  let mockContext: RuleContext;

  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  beforeEach(() => {
    mockContext = {
      athleteId: "athlete-123",
      athlete: { grade_level: 11 },
      schools: [],
      interactions: [],
      tasks: [],
      athleteTasks: [],
      videos: [],
      events: [],
    };
  });

  it("returns null when there are no events", async () => {
    const result = await eventFollowUpRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("ignores events that were not attended", async () => {
    mockContext.events = [
      {
        id: "event-1",
        name: "Area Code Games",
        event_date: daysAgo(1),
        attended: false,
      },
    ] as unknown[];

    const result = await eventFollowUpRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("ignores attended events older than 7 days", async () => {
    mockContext.events = [
      {
        id: "event-1",
        name: "Old Showcase",
        event_date: daysAgo(10),
        attended: true,
      },
    ] as unknown[];

    const result = await eventFollowUpRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("suggests a follow-up for a recently attended event with no interaction logged", async () => {
    mockContext.events = [
      {
        id: "event-1",
        name: "Area Code Games",
        school_id: "school-1",
        event_date: daysAgo(2),
        attended: true,
      },
    ] as unknown[];

    const result = await eventFollowUpRule.evaluate(mockContext);
    expect(Array.isArray(result)).toBe(true);
    const suggestions = result as Array<Record<string, unknown>>;
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      rule_type: "event-follow-up",
      urgency: "medium",
      action_type: "log_interaction",
      related_school_id: "school-1",
    });
    expect(suggestions[0].message).toContain("Area Code Games");
  });

  it("does not suggest follow-up when a matching interaction exists by related_event_id", async () => {
    mockContext.events = [
      {
        id: "event-1",
        name: "Area Code Games",
        event_date: daysAgo(2),
        attended: true,
      },
    ] as unknown[];
    mockContext.interactions = [
      { id: "int-1", occurred_at: daysAgo(1), related_event_id: "event-1" },
    ] as unknown[];

    const result = await eventFollowUpRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("does not suggest follow-up when an interaction occurred after the event", async () => {
    mockContext.events = [
      {
        id: "event-1",
        name: "Area Code Games",
        event_date: daysAgo(3),
        attended: true,
      },
    ] as unknown[];
    mockContext.interactions = [
      { id: "int-1", occurred_at: daysAgo(1), related_event_id: undefined },
    ] as unknown[];

    const result = await eventFollowUpRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("handles multiple recent events, only flagging the ones without follow-up", async () => {
    // Note: hasFollowUp is satisfied by EITHER a matching related_event_id OR
    // any interaction dated after the event — so an interaction dated after
    // "now minus event age" would incorrectly satisfy every older event too.
    // Use an interaction dated BEFORE both events, matched only by id, so the
    // "only flagging the one without follow-up" behavior is isolated cleanly.
    mockContext.events = [
      {
        id: "event-1",
        name: "Has Follow-Up",
        event_date: daysAgo(6),
        attended: true,
      },
      {
        id: "event-2",
        name: "Needs Follow-Up",
        event_date: daysAgo(2),
        attended: true,
      },
    ] as unknown[];
    mockContext.interactions = [
      { id: "int-1", occurred_at: daysAgo(7), related_event_id: "event-1" },
    ] as unknown[];

    const result = await eventFollowUpRule.evaluate(mockContext);
    const suggestions = result as Array<Record<string, unknown>>;
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].message).toContain("Needs Follow-Up");
  });
});
