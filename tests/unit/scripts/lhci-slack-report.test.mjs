import { describe, it, expect } from "vitest";
import {
  getScoreEmoji,
  formatRow,
  buildSlackPayload,
} from "../../../scripts/lhci-slack-report.js";

describe("getScoreEmoji", () => {
  it("returns green for scores >= 90", () => {
    expect(getScoreEmoji(90)).toBe("🟢");
    expect(getScoreEmoji(100)).toBe("🟢");
  });

  it("returns yellow for scores 75–89", () => {
    expect(getScoreEmoji(75)).toBe("🟡");
    expect(getScoreEmoji(89)).toBe("🟡");
  });

  it("returns red for scores below 75", () => {
    expect(getScoreEmoji(74)).toBe("🔴");
    expect(getScoreEmoji(0)).toBe("🔴");
  });
});

describe("formatRow", () => {
  it("formats a row with all four categories", () => {
    const summary = {
      performance: 0.94,
      accessibility: 0.98,
      "best-practices": 1.0,
      seo: 0.92,
    };
    const row = formatRow("https://staging.example.com/login", summary);
    expect(row).toContain("/login");
    expect(row).toContain("94");
    expect(row).toContain("98");
    expect(row).toContain("100");
    expect(row).toContain("92");
  });

  it("shows n/a for missing seo score", () => {
    const summary = {
      performance: 0.76,
      accessibility: 0.94,
      "best-practices": 0.95,
    };
    const row = formatRow("https://staging.example.com/dashboard", summary);
    expect(row).toContain("n/a");
    expect(row).not.toContain("undefined");
  });

  it("uses the pathname not the full URL", () => {
    const summary = {
      performance: 0.8,
      accessibility: 0.9,
      "best-practices": 0.9,
      seo: 0.85,
    };
    const row = formatRow("https://staging.example.com/schools", summary);
    expect(row).toContain("/schools");
    expect(row).not.toContain("https://");
  });
});

describe("buildSlackPayload", () => {
  const entries = [
    {
      url: "https://staging.example.com/login",
      summary: {
        performance: 0.94,
        accessibility: 0.98,
        "best-practices": 1.0,
        seo: 0.92,
      },
    },
    {
      url: "https://staging.example.com/dashboard",
      summary: {
        performance: 0.76,
        accessibility: 0.94,
        "best-practices": 0.95,
      },
    },
  ];

  it("includes the short SHA in the header", () => {
    const payload = buildSlackPayload(
      entries,
      "abc1234567890",
      "https://github.com/run/1",
    );
    expect(payload.text).toContain("abc1234");
  });

  it("includes a link to the GitHub Actions run", () => {
    const payload = buildSlackPayload(
      entries,
      "abc1234567890",
      "https://github.com/run/1",
    );
    const bodyText = JSON.stringify(payload.blocks);
    expect(bodyText).toContain("https://github.com/run/1");
  });

  it("returns a valid Slack blocks payload shape", () => {
    const payload = buildSlackPayload(
      entries,
      "abc1234567890",
      "https://github.com/run/1",
    );
    expect(payload).toHaveProperty("text");
    expect(payload).toHaveProperty("blocks");
    expect(Array.isArray(payload.blocks)).toBe(true);
    expect(payload.blocks.length).toBeGreaterThan(0);
  });
});
