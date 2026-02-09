import { describe, it, expect } from "vitest";
import {
  getTypeIcon,
  getTypeIconBg,
  getTypeIconColor,
  formatType,
  formatSentiment,
  getSentimentBadgeClass,
} from "~/utils/interactionFormatters";

describe("interactionFormatters", () => {
  describe("getTypeIcon", () => {
    it("returns a component for known types", () => {
      expect(getTypeIcon("email")).toBeDefined();
      expect(getTypeIcon("phone_call")).toBeDefined();
      expect(getTypeIcon("text")).toBeDefined();
    });

    it("returns default component for unknown type", () => {
      expect(getTypeIcon("unknown_type")).toBeDefined();
    });
  });

  describe("getTypeIconBg", () => {
    it("returns correct background class for known types", () => {
      expect(getTypeIconBg("email")).toBe("bg-blue-100");
      expect(getTypeIconBg("phone_call")).toBe("bg-purple-100");
      expect(getTypeIconBg("text")).toBe("bg-green-100");
      expect(getTypeIconBg("in_person_visit")).toBe("bg-amber-100");
      expect(getTypeIconBg("virtual_meeting")).toBe("bg-indigo-100");
    });

    it("returns default for unknown type", () => {
      expect(getTypeIconBg("unknown")).toBe("bg-slate-100");
    });
  });

  describe("getTypeIconColor", () => {
    it("returns correct color class for known types", () => {
      expect(getTypeIconColor("email")).toBe("text-blue-600");
      expect(getTypeIconColor("phone_call")).toBe("text-purple-600");
    });

    it("returns default for unknown type", () => {
      expect(getTypeIconColor("unknown")).toBe("text-slate-600");
    });
  });

  describe("formatType", () => {
    it("returns human-readable label for known types", () => {
      expect(formatType("email")).toBe("Email");
      expect(formatType("phone_call")).toBe("Phone Call");
      expect(formatType("in_person_visit")).toBe("In-Person Visit");
      expect(formatType("virtual_meeting")).toBe("Virtual Meeting");
      expect(formatType("dm")).toBe("Direct Message");
    });

    it("returns raw type for unknown types", () => {
      expect(formatType("unknown_type")).toBe("unknown_type");
    });
  });

  describe("formatSentiment", () => {
    it("returns human-readable label for known sentiments", () => {
      expect(formatSentiment("very_positive")).toBe("Very Positive");
      expect(formatSentiment("positive")).toBe("Positive");
      expect(formatSentiment("neutral")).toBe("Neutral");
      expect(formatSentiment("negative")).toBe("Negative");
    });

    it("returns raw sentiment for unknown values", () => {
      expect(formatSentiment("mixed")).toBe("mixed");
    });
  });

  describe("getSentimentBadgeClass", () => {
    it("returns correct class for each sentiment", () => {
      expect(getSentimentBadgeClass("very_positive")).toBe(
        "bg-emerald-100 text-emerald-900",
      );
      expect(getSentimentBadgeClass("positive")).toBe(
        "bg-blue-100 text-blue-900",
      );
      expect(getSentimentBadgeClass("neutral")).toBe(
        "bg-slate-100 text-slate-900",
      );
      expect(getSentimentBadgeClass("negative")).toBe(
        "bg-red-100 text-red-900",
      );
    });

    it("returns default for unknown sentiment", () => {
      expect(getSentimentBadgeClass("unknown")).toBe(
        "bg-slate-100 text-slate-900",
      );
    });
  });
});
