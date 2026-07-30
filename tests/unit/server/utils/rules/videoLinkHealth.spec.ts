import { describe, it, expect, beforeEach } from "vitest";
import { videoLinkHealthRule } from "~/server/utils/rules/videoLinkHealth";
import type { RuleContext } from "~/server/utils/rules/index";

describe("videoLinkHealthRule", () => {
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

  it("returns null when there are no videos", async () => {
    mockContext.videos = [];
    const result = await videoLinkHealthRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("returns null when all videos are healthy", async () => {
    mockContext.videos = [{ title: "Highlight Reel", health_status: "ok" }];
    const result = await videoLinkHealthRule.evaluate(mockContext);
    expect(result).toBeNull();
  });

  it("returns a suggestion for each broken video", async () => {
    mockContext.videos = [
      { title: "Highlight Reel", health_status: "broken" },
      { title: "Game Film", health_status: "ok" },
      { title: "Interview", health_status: "broken" },
    ];
    const result = await videoLinkHealthRule.evaluate(mockContext);
    expect(Array.isArray(result)).toBe(true);
    const suggestions = result as Array<Record<string, unknown>>;
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].rule_type).toBe("video-link-health");
    expect(suggestions[0].urgency).toBe("high");
    expect(suggestions[0].action_type).toBe("update_video");
    expect(suggestions[0].message).toContain("Highlight Reel");
    expect(suggestions[1].message).toContain("Interview");
  });
});
