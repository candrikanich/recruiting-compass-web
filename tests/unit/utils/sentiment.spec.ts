import { describe, it, expect, vi } from "vitest";

vi.mock("~/components/DesignSystem/Badge.vue", () => ({}));

import {
  getSentimentBadgeColor,
  getDirectionBadgeColor,
} from "~/utils/sentiment";

describe("sentiment utils", () => {
  describe("getSentimentBadgeColor", () => {
    it('returns "slate" for null', () => {
      expect(getSentimentBadgeColor(null)).toBe("slate");
    });

    it('returns "slate" for undefined', () => {
      expect(getSentimentBadgeColor(undefined)).toBe("slate");
    });

    it('returns "slate" for empty string', () => {
      expect(getSentimentBadgeColor("")).toBe("slate");
    });

    it('returns "slate" for an unknown value (map fallthrough)', () => {
      expect(getSentimentBadgeColor("unknown_value")).toBe("slate");
    });

    it('returns "emerald" for "very_positive"', () => {
      expect(getSentimentBadgeColor("very_positive")).toBe("emerald");
    });

    it('returns "blue" for "positive"', () => {
      expect(getSentimentBadgeColor("positive")).toBe("blue");
    });

    it('returns "slate" for "neutral"', () => {
      expect(getSentimentBadgeColor("neutral")).toBe("slate");
    });

    it('returns "red" for "negative"', () => {
      expect(getSentimentBadgeColor("negative")).toBe("red");
    });
  });

  describe("getDirectionBadgeColor", () => {
    it('returns "slate" for undefined', () => {
      expect(getDirectionBadgeColor(undefined)).toBe("slate");
    });

    it('returns "emerald" for "inbound"', () => {
      expect(getDirectionBadgeColor("inbound")).toBe("emerald");
    });

    it('returns "purple" for "outbound"', () => {
      expect(getDirectionBadgeColor("outbound")).toBe("purple");
    });

    it('returns "slate" for "other"', () => {
      expect(getDirectionBadgeColor("other")).toBe("slate");
    });
  });
});
