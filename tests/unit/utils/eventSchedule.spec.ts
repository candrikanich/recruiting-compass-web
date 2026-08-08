import { describe, it, expect } from "vitest";
import {
  selectUpcomingEvents,
  renderEventSchedule,
  nextEvent,
  type EventLite,
} from "~/utils/templateResolver";

const NOW = new Date("2026-07-01T12:00:00Z");

const events: EventLite[] = [
  { name: "Area Code Games", start_date: "2026-07-20", city: "Long Beach", state: "CA" },
  { name: "PBR Super 60", start_date: "2026-07-12", city: "Chicago", state: "IL" },
  { name: "Past Showcase", start_date: "2026-06-01", city: "Nowhere", state: "OH" },
  { name: "Prospect Camp", start_date: "2026-08-05", end_date: "2026-08-07", location: "Austin, TX" },
];

describe("selectUpcomingEvents", () => {
  it("drops past events, sorts by start_date, caps", () => {
    const out = selectUpcomingEvents(events, NOW);
    expect(out.map((e) => e.name)).toEqual(["PBR Super 60", "Area Code Games", "Prospect Camp"]);
  });

  it("keeps an event whose end_date is still in the future", () => {
    const spanning: EventLite[] = [{ name: "Multi-day", start_date: "2026-06-29", end_date: "2026-07-03" }];
    expect(selectUpcomingEvents(spanning, NOW).map((e) => e.name)).toEqual(["Multi-day"]);
  });

  it("respects the cap", () => {
    expect(selectUpcomingEvents(events, NOW, 1).map((e) => e.name)).toEqual(["PBR Super 60"]);
  });
});

describe("renderEventSchedule", () => {
  it("renders one dash row per upcoming event: 'Mon D — name, city ST'", () => {
    expect(renderEventSchedule(events, NOW)).toBe(
      [
        "- Jul 12 — PBR Super 60, Chicago, IL",
        "- Jul 20 — Area Code Games, Long Beach, CA",
        "- Aug 5 — Prospect Camp, Austin, TX",
      ].join("\n"),
    );
  });

  it("falls back to location when city/state absent", () => {
    const e: EventLite[] = [{ name: "Camp", start_date: "2026-07-10", location: "Somewhere Field" }];
    expect(renderEventSchedule(e, NOW)).toBe("- Jul 10 — Camp, Somewhere Field");
  });

  it("returns null when there are no upcoming events", () => {
    const past: EventLite[] = [{ name: "Old", start_date: "2020-01-01" }];
    expect(renderEventSchedule(past, NOW)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(renderEventSchedule([], NOW)).toBeNull();
  });
});

describe("nextEvent", () => {
  it("returns the soonest upcoming event's name and single date", () => {
    expect(nextEvent(events, NOW)).toEqual({ name: "PBR Super 60", dates: "Jul 12" });
  });

  it("renders a date range when end_date differs", () => {
    const e: EventLite[] = [{ name: "Camp", start_date: "2026-08-05", end_date: "2026-08-07" }];
    expect(nextEvent(e, NOW)).toEqual({ name: "Camp", dates: "Aug 5–Aug 7" });
  });

  it("returns null when nothing is upcoming", () => {
    expect(nextEvent([], NOW)).toBeNull();
  });
});
