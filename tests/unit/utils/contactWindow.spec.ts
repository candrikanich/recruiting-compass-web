import { describe, it, expect } from "vitest";
import {
  computeWindowOpenDate,
  evaluateContactWindow,
  filterTemplatesByWindow,
  type ContactWindowRule,
} from "~/utils/contactWindow";

// Grade-year math reference (US convention): a `gradYear` athlete finishes grade 12
// in the spring of `gradYear`. Junior (grade 11) academic year runs fall(gradYear-2)
// → spring(gradYear-1); sophomore (grade 10) runs fall(gradYear-3) → spring(gradYear-2).

const baseballD1: ContactWindowRule = {
  sport: "baseball",
  division: "D1",
  rule_kind: "date_before_grade",
  reference: "junior",
  window_date: "Aug 1",
  notes: null,
};

const softballD1: ContactWindowRule = {
  sport: "softball",
  division: "D1",
  rule_kind: "date_after_grade",
  reference: "sophomore",
  window_date: "Sept 1",
  notes: null,
};

const defaultD1: ContactWindowRule = {
  sport: "*",
  division: "D1",
  rule_kind: "date_after_grade",
  reference: "sophomore",
  window_date: "Jun 15",
  notes: null,
};

const d3: ContactWindowRule = {
  sport: "*",
  division: "D3",
  rule_kind: "unrestricted",
  reference: null,
  window_date: null,
  notes: null,
};

describe("computeWindowOpenDate", () => {
  it("baseball D1 opens Aug 1 before junior year (gradYear-2)", () => {
    // gradYear 2028 -> junior academic year starts fall 2026 -> Aug 1, 2026
    expect(computeWindowOpenDate(baseballD1, 2028)).toEqual(new Date(2026, 7, 1));
  });

  it("softball D1 (Sept 1 after sophomore) resolves to start of junior year", () => {
    // gradYear 2028 -> sophomore ends spring 2026 -> Sept 1, 2026
    expect(computeWindowOpenDate(softballD1, 2028)).toEqual(new Date(2026, 8, 1));
  });

  it("default D1 Jun 15 after sophomore -> Jun 15 of gradYear-2", () => {
    expect(computeWindowOpenDate(defaultD1, 2028)).toEqual(new Date(2026, 5, 15));
  });

  it("unrestricted rule has no open date", () => {
    expect(computeWindowOpenDate(d3, 2028)).toBeNull();
  });
});

describe("evaluateContactWindow", () => {
  const rules = [baseballD1, softballD1, defaultD1, d3];

  it("baseball D1 junior-early is 'pre' before Aug 1", () => {
    const res = evaluateContactWindow(rules, {
      sport: "Baseball",
      division: "D1",
      gradYear: 2028,
      today: new Date(2026, 6, 31), // Jul 31, 2026
    });
    expect(res.state).toBe("pre");
  });

  it("baseball D1 is 'open' on/after Aug 1", () => {
    const res = evaluateContactWindow(rules, {
      sport: "baseball",
      division: "D1",
      gradYear: 2028,
      today: new Date(2026, 7, 1),
    });
    expect(res.state).toBe("open");
  });

  it("matches sport case-insensitively", () => {
    const res = evaluateContactWindow(rules, {
      sport: "SOFTBALL",
      division: "D1",
      gradYear: 2028,
      today: new Date(2026, 0, 1),
    });
    expect(res.rule?.sport).toBe("softball");
    expect(res.state).toBe("pre");
  });

  it("falls back to division default when sport has no specific rule", () => {
    const res = evaluateContactWindow(rules, {
      sport: "lacrosse",
      division: "D1",
      gradYear: 2028,
      today: new Date(2026, 0, 1),
    });
    expect(res.rule?.sport).toBe("*");
    expect(res.state).toBe("pre");
  });

  it("D3 is always open (unrestricted)", () => {
    const res = evaluateContactWindow(rules, {
      sport: "baseball",
      division: "D3",
      gradYear: 2030,
      today: new Date(2026, 0, 1),
    });
    expect(res.state).toBe("open");
  });

  it("fails open when division is null", () => {
    const res = evaluateContactWindow(rules, {
      sport: "baseball",
      division: null,
      gradYear: 2028,
      today: new Date(2026, 0, 1),
    });
    expect(res.state).toBe("open");
    expect(res.rule).toBeNull();
  });

  it("fails open when gradYear is missing", () => {
    const res = evaluateContactWindow(rules, {
      sport: "baseball",
      division: "D1",
      gradYear: null,
      today: new Date(2026, 0, 1),
    });
    expect(res.state).toBe("open");
  });

  it("fails open when no rule matches the division at all", () => {
    const res = evaluateContactWindow([baseballD1], {
      sport: "baseball",
      division: "NAIA",
      gradYear: 2028,
      today: new Date(2026, 0, 1),
    });
    expect(res.state).toBe("open");
  });
});

describe("filterTemplatesByWindow", () => {
  const introStandard = { slug: "intro-standard", type: "email", stage: "intro", contact_window: "any" as const };
  const introPre = { slug: "intro-pre-window", type: "email", stage: "intro", contact_window: "pre" as const };
  const followUp = { slug: "follow-up", type: "email", stage: "follow_up", contact_window: "post" as const };
  const all = [introStandard, introPre, followUp];

  it("open state hides the pre-window intro, keeps standard", () => {
    const out = filterTemplatesByWindow(all, "open");
    expect(out.map((t) => t.slug)).toEqual(["intro-standard", "follow-up"]);
  });

  it("pre state hides the standard intro (pre sibling exists), keeps pre + others", () => {
    const out = filterTemplatesByWindow(all, "pre");
    expect(out.map((t) => t.slug)).toEqual(["intro-pre-window", "follow-up"]);
  });

  it("pre state keeps an 'any' template that has no pre sibling", () => {
    const lone = { slug: "thank-you", type: "email", stage: "thanks", contact_window: "any" as const };
    const out = filterTemplatesByWindow([lone], "pre");
    expect(out.map((t) => t.slug)).toEqual(["thank-you"]);
  });
});
