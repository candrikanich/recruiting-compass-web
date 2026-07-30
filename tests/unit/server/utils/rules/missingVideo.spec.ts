import { describe, it, expect, beforeEach } from "vitest";
import { missingVideoRule } from "~/server/utils/rules/missingVideo";
import type { RuleContext } from "~/server/utils/rules/index";

describe("missingVideoRule", () => {
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

  it("returns null for a freshman without videos", async () => {
    mockContext.athlete = { grade_level: 9 };
    mockContext.videos = [];
    const result = await missingVideoRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("returns a suggestion for a sophomore without videos", async () => {
    mockContext.athlete = { grade_level: 10 };
    mockContext.videos = [];
    const result = await missingVideoRule.evaluate(mockContext);
    expect(result).not.toBeNull();
    const suggestion = result as Record<string, unknown>;
    expect(suggestion.rule_type).toBe("missing-video");
    expect(suggestion.action_type).toBe("add_video");
  });

  it("returns null when videos already exist", async () => {
    mockContext.athlete = { grade_level: 11 };
    mockContext.videos = [{ title: "Highlight" }];
    const result = await missingVideoRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("defaults grade_level to 9 when missing", async () => {
    mockContext.athlete = {};
    mockContext.videos = [];
    const result = await missingVideoRule.evaluate(mockContext);
    expect(result).toBeNull();
  });
});
