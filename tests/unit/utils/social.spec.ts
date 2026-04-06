import { describe, it, expect } from "vitest";
import { normalizeHandle } from "~/utils/social";

describe("normalizeHandle", () => {
  describe("twitter", () => {
    it("strips @ prefix", () => {
      expect(normalizeHandle("@CoachSmith", "twitter")).toEqual({
        handle: "CoachSmith",
        isShortUrl: false,
      });
    });
    it("strips twitter.com/ prefix", () => {
      expect(normalizeHandle("twitter.com/CoachSmith", "twitter")).toEqual({
        handle: "CoachSmith",
        isShortUrl: false,
      });
    });
    it("strips https://twitter.com/ prefix", () => {
      expect(
        normalizeHandle("https://twitter.com/CoachSmith", "twitter"),
      ).toEqual({ handle: "CoachSmith", isShortUrl: false });
    });
    it("strips x.com/ prefix", () => {
      expect(normalizeHandle("x.com/CoachSmith", "twitter")).toEqual({
        handle: "CoachSmith",
        isShortUrl: false,
      });
    });
    it("strips https://x.com/ prefix", () => {
      expect(normalizeHandle("https://x.com/CoachSmith", "twitter")).toEqual({
        handle: "CoachSmith",
        isShortUrl: false,
      });
    });
    it("returns bare handle unchanged", () => {
      expect(normalizeHandle("CoachSmith", "twitter")).toEqual({
        handle: "CoachSmith",
        isShortUrl: false,
      });
    });
    it("handles trailing slash", () => {
      expect(normalizeHandle("twitter.com/CoachSmith/", "twitter")).toEqual({
        handle: "CoachSmith",
        isShortUrl: false,
      });
    });
    it("handles empty string", () => {
      expect(normalizeHandle("", "twitter")).toEqual({
        handle: "",
        isShortUrl: false,
      });
    });
    it("trims whitespace", () => {
      expect(normalizeHandle("  @CoachSmith  ", "twitter")).toEqual({
        handle: "CoachSmith",
        isShortUrl: false,
      });
    });
  });

  describe("instagram", () => {
    it("strips @ prefix", () => {
      expect(normalizeHandle("@athlete.23", "instagram")).toEqual({
        handle: "athlete.23",
        isShortUrl: false,
      });
    });
    it("strips instagram.com/ prefix", () => {
      expect(normalizeHandle("instagram.com/athlete.23", "instagram")).toEqual({
        handle: "athlete.23",
        isShortUrl: false,
      });
    });
    it("strips https://instagram.com/ prefix with trailing slash", () => {
      expect(
        normalizeHandle("https://instagram.com/athlete.23/", "instagram"),
      ).toEqual({ handle: "athlete.23", isShortUrl: false });
    });
    it("strips www.instagram.com/ prefix", () => {
      expect(
        normalizeHandle("www.instagram.com/athlete.23", "instagram"),
      ).toEqual({ handle: "athlete.23", isShortUrl: false });
    });
  });

  describe("tiktok", () => {
    it("strips @ prefix", () => {
      expect(normalizeHandle("@athlete_23", "tiktok")).toEqual({
        handle: "athlete_23",
        isShortUrl: false,
      });
    });
    it("strips tiktok.com/@ prefix", () => {
      expect(normalizeHandle("tiktok.com/@athlete_23", "tiktok")).toEqual({
        handle: "athlete_23",
        isShortUrl: false,
      });
    });
    it("strips https://www.tiktok.com/@ prefix", () => {
      expect(
        normalizeHandle("https://www.tiktok.com/@athlete_23", "tiktok"),
      ).toEqual({ handle: "athlete_23", isShortUrl: false });
    });
    it("flags vm.tiktok.com short URL", () => {
      expect(normalizeHandle("vm.tiktok.com/abc123", "tiktok")).toEqual({
        handle: "vm.tiktok.com/abc123",
        isShortUrl: true,
      });
    });
    it("flags vt.tiktok.com short URL", () => {
      expect(normalizeHandle("vt.tiktok.com/abc123", "tiktok")).toEqual({
        handle: "vt.tiktok.com/abc123",
        isShortUrl: true,
      });
    });
    it("flags https://vm.tiktok.com short URL", () => {
      expect(normalizeHandle("https://vm.tiktok.com/abc123", "tiktok")).toEqual(
        { handle: "vm.tiktok.com/abc123", isShortUrl: true },
      );
    });
  });
});
