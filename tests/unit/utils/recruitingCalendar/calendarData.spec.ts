import { describe, it, expect } from "vitest";
import { D1_CALENDARS, D2_ALL_SPORTS, D3_FALLBACK } from "~/utils/recruitingCalendar/calendarData";

const ALL_KEYS = [
  "MBA",
  "WSB",
  "MBB",
  "WBB",
  "FBS",
  "FCS",
  "XCTF",
  "WVB",
  "MGO",
  "MLA",
  "WLA",
  "Other",
  "OTHER_MSOCCER",
  "OTHER_WSOCCER",
  "OTHER_SWIM",
  "OTHER_MICEHOCKEY",
  "OTHER_WICEHOCKEY",
  "OTHER_ROWING",
  "OTHER_FIELDHOCKEY",
  "OTHER_MWRESTLING",
  "OTHER_WWRESTLING",
] as const;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("calendarData integrity (L1)", () => {
  it("has every D1 calendar with source + verifiedOn", () => {
    for (const k of ALL_KEYS) {
      const c = D1_CALENDARS[k];
      expect(c, k).toBeTruthy();
      expect(c.source, k).toMatch(/ncaaorg\.s3\.amazonaws\.com/);
      expect(c.verifiedOn, k).toBe("2026-08-23");
      expect(c.periods.length, k).toBeGreaterThan(0);
    }
  });
  it("every period is well-formed and start<=end", () => {
    for (const k of ALL_KEYS)
      for (const p of D1_CALENDARS[k].periods) {
        expect(p.start, `${k} ${p.description}`).toMatch(ISO);
        expect(p.end).toMatch(ISO);
        expect(p.start <= p.end, `${k} ${p.description}`).toBe(true);
        expect(["dead", "quiet", "contact", "evaluation", "recruiting_shutdown"]).toContain(p.type);
        expect(["HIGH", "MEDIUM", "LOW"]).toContain(p.confidence);
      }
  });
});

describe("plausibility (L3)", () => {
  const month = (iso: string) => Number(iso.slice(5, 7));
  it("dead/shutdown windows sit in plausible months (no summer-holiday-in-spring typos)", () => {
    // Thanksgiving-ish shutdowns land in Nov; winter shutdowns in Dec/Jan; July-4 dead in Jul.
    for (const k of ALL_KEYS)
      for (const p of D1_CALENDARS[k].periods) {
        if (/thanksgiving/i.test(p.description)) expect(month(p.start), `${k}`).toBe(11);
        if (/winter|holiday/i.test(p.description) && p.type !== "contact")
          expect([12, 1]).toContain(month(p.start));
        if (/july 4|independence/i.test(p.description)) expect(month(p.start)).toBe(7);
      }
  });
  it("no period spans more than ~10 months (catches a swapped start/end year)", () => {
    for (const k of ALL_KEYS)
      for (const p of D1_CALENDARS[k].periods) {
        const days = (Date.parse(p.end) - Date.parse(p.start)) / 86400000;
        expect(days, `${k} ${p.description}`).toBeLessThan(310);
        expect(days).toBeGreaterThanOrEqual(0);
      }
  });
});

describe("D2/D3 fallbacks", () => {
  it("D2_ALL_SPORTS + D3_FALLBACK are populated with source + verifiedOn", () => {
    for (const c of [D2_ALL_SPORTS, D3_FALLBACK]) {
      expect(c.periods.length).toBeGreaterThan(0);
      expect(c.verifiedOn).toBe("2026-08-23");
    }
  });
  it("D3_FALLBACK is the generic Other default, not a sub-calendar", () => {
    expect(D3_FALLBACK).toBe(D1_CALENDARS.Other);
  });
});

describe("Other sub-calendars (per-sport bundle expansion)", () => {
  const SUB_KEYS = [
    "OTHER_MSOCCER",
    "OTHER_WSOCCER",
    "OTHER_SWIM",
    "OTHER_MICEHOCKEY",
    "OTHER_WICEHOCKEY",
    "OTHER_ROWING",
    "OTHER_FIELDHOCKEY",
    "OTHER_MWRESTLING",
    "OTHER_WWRESTLING",
  ] as const;
  it("each new sub-key's periods differ from the generic Other default (not just a copy/fallback)", () => {
    for (const k of SUB_KEYS) {
      expect(D1_CALENDARS[k].periods.length, k).toBeGreaterThan(0);
      expect(D1_CALENDARS[k].periods, k).not.toEqual(D1_CALENDARS.Other.periods);
    }
  });
  it("soccer sub-calendars are gender-distinct", () => {
    expect(D1_CALENDARS.OTHER_MSOCCER.periods).not.toEqual(D1_CALENDARS.OTHER_WSOCCER.periods);
  });
  it("ice hockey sub-calendars are gender-distinct", () => {
    expect(D1_CALENDARS.OTHER_MICEHOCKEY.periods).not.toEqual(D1_CALENDARS.OTHER_WICEHOCKEY.periods);
  });
  it("wrestling sub-calendars are gender-distinct", () => {
    expect(D1_CALENDARS.OTHER_MWRESTLING.periods).not.toEqual(D1_CALENDARS.OTHER_WWRESTLING.periods);
  });
});
