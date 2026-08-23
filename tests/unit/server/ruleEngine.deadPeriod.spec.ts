/**
 * Regression test for the sport-agnostic dead-period bug: the rule engine
 * used to gate contact rules off baseball's own dead-period dates for EVERY
 * sport (it called `isDeadPeriod(now, division)` with no sport). A Tennis (or
 * any non-baseball) athlete whose schools sat on a date that was dead for
 * baseball had their contact suggestions silently suppressed for a sport
 * whose actual NCAA calendar had no such dead window.
 *
 * Concrete dates (from utils/recruitingCalendar/calendarData.ts, D1 track):
 * - Baseball (MBA): 2027-07-03..2027-07-05 is a "Dead period (July 4th)".
 * - Tennis has no dedicated NCAA sub-calendar and resolves to the generic
 *   "Other" track (OTHER), whose only dead period is 2026-11-09..2026-11-12
 *   — nowhere near July 2027. So 2027-07-04 is a normal contact-eligible day
 *   for a Tennis athlete.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { RuleEngine } from "~/server/utils/ruleEngine";
import type { Rule, RuleContext } from "~/server/utils/rules/index";

const JULY_FOURTH_DEAD_FOR_BASEBALL = new Date("2027-07-04T12:00:00Z");

function buildContext(overrides: Partial<RuleContext>): RuleContext {
  return {
    athleteId: "athlete-123",
    athlete: {},
    schools: [{ id: "school-1", division: "D1" }],
    interactions: [],
    tasks: [],
    athleteTasks: [],
    videos: [],
    events: [],
    ...overrides,
  };
}

function buildContactRule(id = "interaction-gap"): Rule {
  return {
    id,
    name: "Interaction Gap",
    description: "Contact rule under test",
    evaluate: vi.fn().mockResolvedValue({
      rule_type: id,
      urgency: "medium",
      message: "Contact reminder",
      action_type: "log_interaction",
    }),
  };
}

describe("RuleEngine dead-period gating is sport-aware (not baseball-only)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does NOT suppress contact rules for a non-baseball athlete on a date dead only for baseball", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(JULY_FOURTH_DEAD_FOR_BASEBALL);

    const engine = new RuleEngine();
    const contactRule = buildContactRule();
    engine.addRule(contactRule);

    const context = buildContext({ sport: "Tennis" });
    const result = await engine.evaluateAll(context);

    expect(contactRule.evaluate).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("positive control: DOES suppress contact rules for a baseball athlete on the same date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(JULY_FOURTH_DEAD_FOR_BASEBALL);

    const engine = new RuleEngine();
    const contactRule = buildContactRule();
    engine.addRule(contactRule);

    const context = buildContext({ sport: "Baseball" });
    const result = await engine.evaluateAll(context);

    expect(contactRule.evaluate).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("non-contact rules are never gated by dead periods, regardless of sport", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(JULY_FOURTH_DEAD_FOR_BASEBALL);

    const engine = new RuleEngine();
    const nonContactRule: Rule = {
      id: "portfolio-health",
      name: "Portfolio Health",
      description: "Non-contact rule",
      evaluate: vi.fn().mockResolvedValue({
        rule_type: "portfolio-health",
        urgency: "medium",
        message: "Portfolio needs review",
        action_type: "log_interaction",
      }),
    };
    engine.addRule(nonContactRule);

    const context = buildContext({ sport: "Baseball" });
    const result = await engine.evaluateAll(context);

    expect(nonContactRule.evaluate).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
