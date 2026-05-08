import { describe, it, expect } from "vitest";
import { parseAcceptHeader, shouldServeMarkdown } from "~/server/agent-content/negotiation";
import { renderProfileMarkdown } from "~/server/agent-content/profile";
import { STATIC_MARKDOWN } from "~/server/agent-content/static";
import type { PublicProfileData } from "~/types/models";

describe("parseAcceptHeader", () => {
  it("returns empty map for empty input", () => {
    expect(parseAcceptHeader("").size).toBe(0);
  });

  it("parses single media type with default q=1", () => {
    const r = parseAcceptHeader("text/markdown");
    expect(r.get("text/markdown")).toBe(1);
  });

  it("parses explicit q-values", () => {
    const r = parseAcceptHeader("text/html;q=0.9, text/markdown;q=0.5");
    expect(r.get("text/html")).toBe(0.9);
    expect(r.get("text/markdown")).toBe(0.5);
  });

  it("ignores invalid q-values", () => {
    const r = parseAcceptHeader("text/markdown;q=2.0");
    expect(r.get("text/markdown")).toBe(1);
  });

  it("is case-insensitive on media type", () => {
    const r = parseAcceptHeader("TEXT/Markdown");
    expect(r.get("text/markdown")).toBe(1);
  });
});

describe("shouldServeMarkdown", () => {
  it("returns false when header is missing", () => {
    expect(shouldServeMarkdown(undefined)).toBe(false);
  });

  it("returns false for typical browser Accept", () => {
    const browser = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
    expect(shouldServeMarkdown(browser)).toBe(false);
  });

  it("returns true for explicit text/markdown", () => {
    expect(shouldServeMarkdown("text/markdown")).toBe(true);
  });

  it("returns true when markdown q ≥ html q", () => {
    expect(shouldServeMarkdown("text/markdown, text/html;q=0.9")).toBe(true);
    expect(shouldServeMarkdown("text/markdown;q=1.0, text/html;q=1.0")).toBe(true);
  });

  it("returns false when html outranks markdown", () => {
    expect(shouldServeMarkdown("text/markdown;q=0.5, text/html;q=1.0")).toBe(false);
  });

  it("returns false when markdown q is zero", () => {
    expect(shouldServeMarkdown("text/markdown;q=0, text/html")).toBe(false);
  });
});

describe("STATIC_MARKDOWN registry", () => {
  it("covers the homepage and all help routes", () => {
    expect(STATIC_MARKDOWN["/"]).toMatch(/# The Recruiting Compass/);
    expect(STATIC_MARKDOWN["/help"]).toMatch(/# Help Center/);
    expect(STATIC_MARKDOWN["/help/getting-started"]).toMatch(/# Getting Started/);
    expect(STATIC_MARKDOWN["/help/account"]).toMatch(/# Account/);
    expect(STATIC_MARKDOWN["/help/phases"]).toMatch(/# Phases/);
    expect(STATIC_MARKDOWN["/help/schools"]).toMatch(/# Schools/);
  });
});

describe("renderProfileMarkdown", () => {
  const baseProfile: PublicProfileData = {
    playerName: "Jane Doe",
    photoUrl: null,
    headerColor: "slate",
    bio: "Two-sport athlete from Ohio.",
    academics: {
      gpa: 3.8,
      sat_score: 1340,
      graduation_year: 2027,
      high_school: "Springfield HS",
    },
    athletic: {
      primary_sport: "Soccer",
      primary_position: "Midfielder",
      positions: ["Midfielder", "Forward"],
      height_inches: 67,
      weight_lbs: 145,
    },
    film: [
      { platform: "youtube", url: "https://youtu.be/abc", title: "2025 Highlights" },
    ],
    schools: [
      { id: "11111111-1111-1111-1111-111111111111", name: "Some University" },
    ],
  };

  it("renders the player name as H1", () => {
    const md = renderProfileMarkdown("jane-doe", baseProfile);
    expect(md.startsWith("# Jane Doe")).toBe(true);
  });

  it("includes the slug as the source link", () => {
    const md = renderProfileMarkdown("jane-doe", baseProfile);
    expect(md).toContain("Source: https://myrecruitingcompass.com/p/jane-doe");
  });

  it("renders height in feet/inches", () => {
    const md = renderProfileMarkdown("jane-doe", baseProfile);
    expect(md).toContain("**Height:** 5'7\" (67 in)");
  });

  it("omits sections that are null", () => {
    const minimal: PublicProfileData = {
      ...baseProfile,
      academics: null,
      athletic: null,
      film: null,
      schools: null,
      bio: null,
    };
    const md = renderProfileMarkdown("min", minimal);
    expect(md).not.toContain("## Academics");
    expect(md).not.toContain("## Athletic");
    expect(md).not.toContain("## Film");
    expect(md).not.toContain("## Schools of interest");
  });

  it("includes film links", () => {
    const md = renderProfileMarkdown("jane-doe", baseProfile);
    expect(md).toContain("[2025 Highlights (youtube)](https://youtu.be/abc)");
  });
});
