import { describe, it, expect, beforeEach } from "vitest";
import { prioritySchoolReminderRule } from "~/server/utils/rules/prioritySchoolReminder";
import type { RuleContext } from "~/server/utils/rules/index";

describe("prioritySchoolReminderRule", () => {
  let mockContext: RuleContext;

  beforeEach(() => {
    mockContext = {
      athleteId: "athlete-123",
      athlete: { grade_level: 10 },
      schools: [],
      interactions: [],
      tasks: [],
      athleteTasks: [],
      videos: [],
      events: [],
    };
  });

  it("returns null when there are no priority-A schools", async () => {
    mockContext.schools = [{ id: "s1", name: "State U", priority: "B" }];
    const result = await prioritySchoolReminderRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("returns null when a priority-A school was contacted recently", async () => {
    mockContext.schools = [{ id: "s1", name: "State U", priority: "A" }];
    mockContext.interactions = [
      { school_id: "s1", occurred_at: new Date().toISOString() },
    ];
    const result = await prioritySchoolReminderRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("returns a suggestion when a priority-A school has had no contact", async () => {
    mockContext.schools = [{ id: "s1", name: "State U", priority: "A" }];
    mockContext.interactions = [];
    const result = await prioritySchoolReminderRule.evaluate(mockContext);
    expect(Array.isArray(result)).toBe(true);
    const suggestions = result as Array<Record<string, unknown>>;
    expect(suggestions[0].action_type).toBe("log_interaction");
    expect(suggestions[0].related_school_id).toBe("s1");
  });

  it("uses the most recent of multiple interactions to judge staleness", async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date().toISOString();
    mockContext.schools = [{ id: "s1", name: "State U", priority: "A" }];
    mockContext.interactions = [
      { school_id: "s1", occurred_at: old },
      { school_id: "s1", occurred_at: recent },
    ];
    const result = await prioritySchoolReminderRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("returns a suggestion when the most recent contact is 14+ days stale", async () => {
    const veryOld = new Date(
      Date.now() - 40 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    mockContext.schools = [{ id: "s1", name: "State U", priority: "A" }];
    mockContext.interactions = [
      { school_id: "s1", occurred_at: veryOld },
      { school_id: "s1", occurred_at: old },
    ];
    const result = await prioritySchoolReminderRule.evaluate(mockContext);
    expect(result).not.toBeNull();
  });
});
