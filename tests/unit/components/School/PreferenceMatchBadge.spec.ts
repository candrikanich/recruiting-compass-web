import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import PreferenceMatchBadge from "~/components/School/PreferenceMatchBadge.vue";
import { createMockSchool } from "~/tests/fixtures/schools.fixture";
import type { MatchResult } from "~/composables/useSchoolMatching";

const mockCalculateMatchScore = vi.fn();
const mockGetMatchBadge = vi.fn();

vi.mock("~/composables/useSchoolMatching", () => ({
  useSchoolMatching: () => ({
    calculateMatchScore: mockCalculateMatchScore,
    getMatchBadge: mockGetMatchBadge,
  }),
}));

describe("PreferenceMatchBadge", () => {
  const school = createMockSchool({ id: "s1", name: "Test U" });

  const makeMatchResult = (
    overrides: Partial<MatchResult> = {},
  ): MatchResult => ({
    score: 75,
    matchedCriteria: [],
    missedCriteria: [],
    dealbreakers: [],
    hasDealbreakers: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateMatchScore.mockReturnValue(makeMatchResult());
    mockGetMatchBadge.mockReturnValue(null);
  });

  const mountBadge = (props: Record<string, unknown> = {}) =>
    mount(PreferenceMatchBadge, {
      props: { school, ...props },
    });

  describe("visibility", () => {
    it("hides badge when score < 60 and no dealbreakers", () => {
      mockCalculateMatchScore.mockReturnValue(
        makeMatchResult({ score: 50, hasDealbreakers: false }),
      );
      mockGetMatchBadge.mockReturnValue(null);

      const wrapper = mountBadge();
      expect(wrapper.find("span").exists()).toBe(false);
    });

    it("shows badge when getMatchBadge returns a badge", () => {
      mockGetMatchBadge.mockReturnValue({
        label: "Good Match",
        class: "badge badge-warning",
        icon: "○",
      });

      const wrapper = mountBadge();
      expect(wrapper.text()).toContain("Good Match");
    });
  });

  describe("badge types", () => {
    it("shows dealbreaker badge in red", () => {
      mockCalculateMatchScore.mockReturnValue(
        makeMatchResult({
          score: 30,
          hasDealbreakers: true,
          dealbreakers: ["division"],
        }),
      );
      mockGetMatchBadge.mockReturnValue({
        label: "Dealbreaker",
        class: "badge badge-danger",
        icon: "\u26A0\uFE0F",
      });

      const wrapper = mountBadge();
      expect(wrapper.text()).toContain("Dealbreaker");
    });

    it("shows great match badge for score >= 80", () => {
      mockCalculateMatchScore.mockReturnValue(makeMatchResult({ score: 85 }));
      mockGetMatchBadge.mockReturnValue({
        label: "Great Match",
        class: "badge badge-success",
        icon: "\u2713",
      });

      const wrapper = mountBadge();
      expect(wrapper.text()).toContain("Great Match");
    });

    it("shows good match badge for score 60-79", () => {
      mockCalculateMatchScore.mockReturnValue(makeMatchResult({ score: 65 }));
      mockGetMatchBadge.mockReturnValue({
        label: "Good Match",
        class: "badge badge-warning",
        icon: "\u25CB",
      });

      const wrapper = mountBadge();
      expect(wrapper.text()).toContain("Good Match");
    });
  });

  describe("showScore prop", () => {
    it("shows score percentage when showScore is true", () => {
      mockCalculateMatchScore.mockReturnValue(
        makeMatchResult({ score: 75, hasDealbreakers: false }),
      );
      mockGetMatchBadge.mockReturnValue({
        label: "Good Match",
        class: "badge badge-warning",
        icon: "○",
      });

      const wrapper = mountBadge({ showScore: true });
      expect(wrapper.text()).toContain("75%");
    });

    it("hides score when showScore is false", () => {
      mockCalculateMatchScore.mockReturnValue(makeMatchResult({ score: 75 }));
      mockGetMatchBadge.mockReturnValue({
        label: "Good Match",
        class: "badge badge-warning",
        icon: "○",
      });

      const wrapper = mountBadge({ showScore: false });
      expect(wrapper.text()).not.toContain("75%");
    });

    it("hides score when dealbreakers present even if showScore true", () => {
      mockCalculateMatchScore.mockReturnValue(
        makeMatchResult({ score: 40, hasDealbreakers: true }),
      );
      mockGetMatchBadge.mockReturnValue({
        label: "Dealbreaker",
        class: "badge badge-danger",
        icon: "\u26A0\uFE0F",
      });

      const wrapper = mountBadge({ showScore: true });
      expect(wrapper.text()).not.toContain("40%");
    });
  });

  describe("showIcon prop", () => {
    it("shows icon when showIcon is true", () => {
      mockGetMatchBadge.mockReturnValue({
        label: "Great Match",
        class: "badge badge-success",
        icon: "\u2713",
      });

      const wrapper = mountBadge({ showIcon: true });
      expect(wrapper.text()).toContain("\u2713");
    });

    it("hides icon when showIcon is false or undefined", () => {
      mockGetMatchBadge.mockReturnValue({
        label: "Great Match",
        class: "badge badge-success",
        icon: "\u2713",
      });

      const wrapper = mountBadge({ showIcon: false });
      expect(wrapper.text()).not.toContain("\u2713");
    });
  });

  describe("composable integration", () => {
    it("passes school to calculateMatchScore", () => {
      mockGetMatchBadge.mockReturnValue(null);
      mountBadge();

      expect(mockCalculateMatchScore).toHaveBeenCalledWith(school);
    });

    it("passes score and hasDealbreakers to getMatchBadge", () => {
      mockCalculateMatchScore.mockReturnValue(
        makeMatchResult({ score: 85, hasDealbreakers: false }),
      );
      mockGetMatchBadge.mockReturnValue(null);

      mountBadge();

      expect(mockGetMatchBadge).toHaveBeenCalledWith(85, false);
    });
  });
});
