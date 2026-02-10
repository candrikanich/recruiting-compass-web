import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolCard from "~/components/School/SchoolCard.vue";
import { createMockSchool } from "~/tests/fixtures/schools.fixture";

vi.mock("~/composables/useSchoolLogos", () => ({
  useSchoolLogos: () => ({
    fetchSchoolLogo: vi.fn().mockResolvedValue(null),
    getSchoolLogoCached: vi.fn().mockReturnValue(undefined),
    isLoading: { value: false },
  }),
}));

describe("SchoolCard", () => {
  const defaultSchool = createMockSchool({
    id: "s1",
    name: "University of Florida",
    location: "Gainesville, FL",
    division: "D1",
    conference: "SEC",
    is_favorite: false,
    priority_tier: "A",
  });

  const defaultProps = {
    school: { ...defaultSchool, fit_score: 85 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountCard = (props: Record<string, unknown> = {}) =>
    mount(SchoolCard, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          SchoolLogo: {
            template: '<div data-testid="school-logo-stub"></div>',
            props: ["school", "size"],
          },
        },
      },
    });

  describe("basic display", () => {
    it("renders school name", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain("University of Florida");
    });

    it("renders location when present", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain("Gainesville, FL");
    });

    it("hides location when not present", () => {
      const school = {
        ...createMockSchool(),
        location: undefined,
        fit_score: null,
      };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).not.toContain("\uD83D\uDCCD");
    });

    it("renders division badge", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain("D1");
    });

    it("renders conference badge", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain("SEC");
    });

    it("renders SchoolLogo stub", () => {
      const wrapper = mountCard();
      expect(wrapper.find('[data-testid="school-logo-stub"]').exists()).toBe(
        true,
      );
    });
  });

  describe("priority tier badge", () => {
    it("shows A tier as Top Choice with red styling", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain("A - Top Choice");
      const badge = wrapper.find('[data-testid="priority-tier-badge-A"]');
      expect(badge.classes()).toContain("bg-red-100");
    });

    it("shows B tier as Strong Interest with amber styling", () => {
      const school = {
        ...createMockSchool({ priority_tier: "B" }),
        fit_score: null,
      };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).toContain("B - Strong Interest");
      const badge = wrapper.find('[data-testid="priority-tier-badge-B"]');
      expect(badge.classes()).toContain("bg-amber-100");
    });

    it("shows C tier as Fallback with slate styling", () => {
      const school = {
        ...createMockSchool({ priority_tier: "C" }),
        fit_score: null,
      };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).toContain("C - Fallback");
      const badge = wrapper.find('[data-testid="priority-tier-badge-C"]');
      expect(badge.classes()).toContain("bg-slate-100");
    });

    it("hides priority badge when no tier set", () => {
      const school = {
        ...createMockSchool({ priority_tier: null }),
        fit_score: null,
      };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).not.toContain("Top Choice");
      expect(wrapper.text()).not.toContain("Strong Interest");
      expect(wrapper.text()).not.toContain("Fallback");
    });
  });

  describe("fit score badge", () => {
    it("shows green badge for score >= 70", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain("85/100");
      const scoreSpan = wrapper
        .findAll("span")
        .find((s) => s.text() === "85/100");
      expect(scoreSpan?.classes()).toContain("bg-emerald-100");
    });

    it("shows orange badge for score 50-69", () => {
      const school = { ...defaultSchool, fit_score: 55 };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).toContain("55/100");
      const scoreSpan = wrapper
        .findAll("span")
        .find((s) => s.text() === "55/100");
      expect(scoreSpan?.classes()).toContain("bg-orange-100");
    });

    it("shows red badge for score < 50", () => {
      const school = { ...defaultSchool, fit_score: 30 };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).toContain("30/100");
      const scoreSpan = wrapper
        .findAll("span")
        .find((s) => s.text() === "30/100");
      expect(scoreSpan?.classes()).toContain("bg-red-100");
    });

    it("hides fit score when null", () => {
      const school = { ...defaultSchool, fit_score: null };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).not.toContain("/100");
    });

    it("hides fit score when undefined", () => {
      const school = { ...defaultSchool, fit_score: undefined };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).not.toContain("/100");
    });

    it("rounds decimal scores", () => {
      const school = { ...defaultSchool, fit_score: 72.6 };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).toContain("73/100");
    });
  });

  describe("stats section", () => {
    it("shows coach and interaction counts when stats provided", () => {
      const wrapper = mountCard({
        stats: { coaches: 5, interactions: 12 },
      });
      expect(wrapper.text()).toContain("5");
      expect(wrapper.text()).toContain("coaches");
      expect(wrapper.text()).toContain("12");
      expect(wrapper.text()).toContain("interactions");
    });

    it("hides stats when not provided", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).not.toContain("coaches");
      expect(wrapper.text()).not.toContain("interactions");
    });

    it("shows zero counts", () => {
      const wrapper = mountCard({
        stats: { coaches: 0, interactions: 0 },
      });
      expect(wrapper.text()).toContain("0");
    });
  });

  describe("favorite toggle", () => {
    it("shows filled star when favorite", () => {
      const school = {
        ...defaultSchool,
        is_favorite: true,
        fit_score: null,
      };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).toContain("\u2B50");
    });

    it("shows outline star when not favorite", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain("\u2606");
    });

    it("emits toggle on star click", async () => {
      const wrapper = mountCard();
      const starBtn = wrapper.findAll("button").find((b) => {
        const text = b.text();
        return text.includes("\u2606") || text.includes("\u2B50");
      });

      await starBtn!.trigger("click");
      expect(wrapper.emitted("toggle")).toBeTruthy();
    });

    it("does not emit click when star is clicked (stopPropagation)", async () => {
      const wrapper = mountCard();
      const starBtn = wrapper.findAll("button").find((b) => {
        const text = b.text();
        return text.includes("\u2606") || text.includes("\u2B50");
      });

      await starBtn!.trigger("click");
      expect(wrapper.emitted("click")).toBeFalsy();
    });
  });

  describe("card click", () => {
    it("emits click when card is clicked", async () => {
      const wrapper = mountCard();
      await wrapper.find(".school-card").trigger("click");
      expect(wrapper.emitted("click")).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("renders with no division", () => {
      const school = {
        ...createMockSchool({ division: undefined }),
        fit_score: null,
      };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).toContain(school.name);
    });

    it("renders with no conference", () => {
      const school = {
        ...createMockSchool({ conference: undefined }),
        fit_score: null,
      };
      const wrapper = mountCard({ school });
      expect(wrapper.text()).not.toContain("SEC");
    });

    it("renders with no badges section when nothing to show", () => {
      const school = {
        ...createMockSchool({
          division: undefined,
          priority_tier: null,
          conference: undefined,
        }),
        fit_score: null,
      };
      const wrapper = mountCard({ school });
      // Card should still render
      expect(wrapper.find(".school-card").exists()).toBe(true);
    });
  });
});
