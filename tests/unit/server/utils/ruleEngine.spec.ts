import { describe, it, expect, beforeEach, vi } from "vitest";
import { RuleEngine } from "~/server/utils/ruleEngine";
import type { Rule, RuleContext } from "~/server/utils/rules/index";
import type { SuggestionData } from "~/types/timeline";

describe("RuleEngine", () => {
  let engine: RuleEngine;
  let mockContext: RuleContext;

  beforeEach(() => {
    engine = new RuleEngine();
    mockContext = {
      athleteId: "athlete-123",
      athlete: {},
      schools: [],
      interactions: [],
      tasks: [],
      athleteTasks: [],
      videos: [],
      events: [],
    };
  });

  describe("rule registration", () => {
    it("should register rules successfully", () => {
      const mockRule: Rule = {
        id: "test-rule",
        name: "Test Rule",
        description: "A test rule",
        evaluate: vi.fn().mockResolvedValue(null),
      };

      engine.addRule(mockRule);
      expect((engine as any).rules).toContain(mockRule);
    });

    it("should allow multiple rules to be registered", () => {
      const rule1: Rule = {
        id: "rule-1",
        name: "Rule 1",
        description: "First rule",
        evaluate: vi.fn().mockResolvedValue(null),
      };

      const rule2: Rule = {
        id: "rule-2",
        name: "Rule 2",
        description: "Second rule",
        evaluate: vi.fn().mockResolvedValue(null),
      };

      engine.addRule(rule1);
      engine.addRule(rule2);
      expect((engine as any).rules.length).toBe(2);
    });
  });

  describe("evaluateAll", () => {
    it("should evaluate all registered rules", async () => {
      const rule1Eval = vi.fn().mockResolvedValue(null);
      const rule2Eval = vi.fn().mockResolvedValue(null);

      const rule1: Rule = {
        id: "rule-1",
        name: "Rule 1",
        description: "First rule",
        evaluate: rule1Eval,
      };

      const rule2: Rule = {
        id: "rule-2",
        name: "Rule 2",
        description: "Second rule",
        evaluate: rule2Eval,
      };

      engine.addRule(rule1);
      engine.addRule(rule2);

      await engine.evaluateAll(mockContext);

      expect(rule1Eval).toHaveBeenCalledWith(mockContext);
      expect(rule2Eval).toHaveBeenCalledWith(mockContext);
    });

    it("should handle array returns from rules", async () => {
      const suggestions: SuggestionData[] = [
        {
          rule_type: "test-rule",
          urgency: "high",
          message: "Test 1",
          action_type: "log_interaction",
        },
        {
          rule_type: "test-rule",
          urgency: "medium",
          message: "Test 2",
          action_type: "log_interaction",
        },
      ];

      const rule: Rule = {
        id: "array-rule",
        name: "Array Rule",
        description: "Returns array",
        evaluate: vi.fn().mockResolvedValue(suggestions),
      };

      engine.addRule(rule);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(2);
      expect(result[0].message).toBe("Test 1");
      expect(result[1].message).toBe("Test 2");
    });

    it("should handle single suggestion returns from rules", async () => {
      const suggestion: SuggestionData = {
        rule_type: "test-rule",
        urgency: "high",
        message: "Single test",
        action_type: "log_interaction",
      };

      const rule: Rule = {
        id: "single-rule",
        name: "Single Rule",
        description: "Returns single suggestion",
        evaluate: vi.fn().mockResolvedValue(suggestion),
      };

      engine.addRule(rule);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(1);
      expect(result[0].message).toBe("Single test");
    });

    it("should handle null returns from rules", async () => {
      const rule: Rule = {
        id: "null-rule",
        name: "Null Rule",
        description: "Returns null",
        evaluate: vi.fn().mockResolvedValue(null),
      };

      engine.addRule(rule);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(0);
    });

    it("should handle rule evaluation errors gracefully", async () => {
      const mockError = new Error("Rule evaluation failed");
      const rule: Rule = {
        id: "error-rule",
        name: "Error Rule",
        description: "Throws error",
        evaluate: vi.fn().mockRejectedValue(mockError),
      };

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      engine.addRule(rule);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("error-rule"),
        mockError,
      );

      consoleSpy.mockRestore();
    });

    it("should combine results from multiple rules", async () => {
      const suggestion1: SuggestionData = {
        rule_type: "rule-1",
        urgency: "high",
        message: "From rule 1",
        action_type: "log_interaction",
      };

      const suggestion2: SuggestionData = {
        rule_type: "rule-2",
        urgency: "medium",
        message: "From rule 2",
        action_type: "log_interaction",
      };

      const rule1: Rule = {
        id: "rule-1",
        name: "Rule 1",
        description: "First rule",
        evaluate: vi.fn().mockResolvedValue(suggestion1),
      };

      const rule2: Rule = {
        id: "rule-2",
        name: "Rule 2",
        description: "Second rule",
        evaluate: vi.fn().mockResolvedValue([suggestion2]),
      };

      engine.addRule(rule1);
      engine.addRule(rule2);
      const result = await engine.evaluateAll(mockContext);

      expect(result.length).toBe(2);
    });
  });
});
