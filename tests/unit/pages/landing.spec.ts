import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import LandingPage from "~/pages/index.vue";

vi.mock("vue-router", () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(() => ({ query: {} })),
}));

vi.mock("~/components/Auth/MultiSportFieldBackground.vue", () => ({
  default: {
    name: "MultiSportFieldBackground",
    template: '<div class="multi-sport-field-background"></div>',
  },
}));

const mountPage = () =>
  mount(LandingPage, {
    global: {
      stubs: {
        NuxtLink: {
          template: '<a :href="to" :class="$attrs.class"><slot /></a>',
          props: ["to"],
        },
      },
    },
  });

describe("pages/index.vue (Landing Page)", () => {
  describe("Rendering", () => {
    it("renders the page container", () => {
      const wrapper = mountPage();
      expect(wrapper.find(".min-h-screen").exists()).toBe(true);
    });

    it("renders the logo image with descriptive alt text", () => {
      const wrapper = mountPage();
      const logo = wrapper.find("img");
      expect(logo.exists()).toBe(true);
      expect(logo.attributes("alt")).toContain("Recruiting Compass");
      expect(logo.attributes("alt")).toContain("recruiting tracker");
    });
  });

  describe("Navigation Links", () => {
    it('renders a "Sign In" link pointing to /login', () => {
      const wrapper = mountPage();
      const signInLink = wrapper
        .findAll("a")
        .find((a) => a.text().includes("Sign In"));
      expect(signInLink).toBeDefined();
      expect(signInLink!.attributes("href")).toBe("/login");
    });

    it('renders a "Create Account" link pointing to /signup', () => {
      const wrapper = mountPage();
      const signupLink = wrapper
        .findAll("a")
        .find((a) => a.text().includes("Create Account"));
      expect(signupLink).toBeDefined();
      expect(signupLink!.attributes("href")).toBe("/signup");
    });
  });

  describe("Feature Cards", () => {
    it("renders exactly 3 feature cards", () => {
      const wrapper = mountPage();
      const cards = wrapper.findAll(".bg-white\\/10");
      expect(cards).toHaveLength(3);
    });

    it('renders "Track Schools" feature card with description', () => {
      const wrapper = mountPage();
      expect(wrapper.text()).toContain("Track Schools");
      expect(wrapper.text()).toContain(
        "Organize and manage your target colleges in one place",
      );
    });

    it('renders "Log Interactions" feature card with description', () => {
      const wrapper = mountPage();
      expect(wrapper.text()).toContain("Log Interactions");
      expect(wrapper.text()).toContain(
        "Keep track of every conversation with coaches",
      );
    });

    it('renders "Monitor Progress" feature card with description', () => {
      const wrapper = mountPage();
      expect(wrapper.text()).toContain("Monitor Progress");
      expect(wrapper.text()).toContain(
        "Visualize your recruiting journey with insights",
      );
    });

    it("renders an SVG icon in each feature card", () => {
      const wrapper = mountPage();
      const cards = wrapper.findAll(".bg-white\\/10");
      for (const card of cards) {
        expect(card.find("svg").exists()).toBe(true);
      }
    });
  });

  describe("Visual Elements", () => {
    it("renders the MultiSportFieldBackground component", () => {
      const wrapper = mountPage();
      expect(wrapper.find(".multi-sport-field-background").exists()).toBe(true);
    });

    it("renders 4 decorative animated circles", () => {
      const wrapper = mountPage();
      const pulsingCircles = wrapper.findAll(".animate-pulse");
      expect(pulsingCircles).toHaveLength(4);
    });

    it("decorative circles have staggered animation delays", () => {
      const wrapper = mountPage();
      const circles = wrapper.findAll(".animate-pulse");
      expect(circles[1].attributes("style")).toContain("animation-delay");
      expect(circles[2].attributes("style")).toContain("animation-delay");
      expect(circles[3].attributes("style")).toContain("animation-delay");
    });
  });

  describe("Layout", () => {
    it("uses the public layout via definePageMeta", () => {
      const wrapper = mountPage();
      expect(wrapper.find("[data-testid='sidebar']").exists()).toBe(false);
      expect(wrapper.find("[data-testid='user-menu']").exists()).toBe(false);
    });

    it("has responsive CTA button layout (flex-col on mobile, flex-row on sm+)", () => {
      const wrapper = mountPage();
      const ctaContainer = wrapper.find(".flex.flex-col.sm\\:flex-row");
      expect(ctaContainer.exists()).toBe(true);
    });

    it("has responsive feature grid (1 col on mobile, 3 cols on md+)", () => {
      const wrapper = mountPage();
      const grid = wrapper.find(".grid-cols-1.md\\:grid-cols-3");
      expect(grid.exists()).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("uses <main> landmark for content area", () => {
      const wrapper = mountPage();
      expect(wrapper.find("main").exists()).toBe(true);
    });

    it("has a visually-hidden h1 heading", () => {
      const wrapper = mountPage();
      const h1 = wrapper.find("h1");
      expect(h1.exists()).toBe(true);
      expect(h1.classes()).toContain("sr-only");
      expect(h1.text()).toBe("Recruiting Compass");
    });

    it("has a visually-hidden h2 for the features section", () => {
      const wrapper = mountPage();
      const h2 = wrapper.find("h2");
      expect(h2.exists()).toBe(true);
      expect(h2.classes()).toContain("sr-only");
      expect(h2.text()).toBe("Features");
    });

    it("has proper heading hierarchy (h1 > h2 > h3)", () => {
      const wrapper = mountPage();
      expect(wrapper.find("h1").exists()).toBe(true);
      expect(wrapper.find("h2").exists()).toBe(true);
      expect(wrapper.findAll("h3")).toHaveLength(3);
    });

    it("renders a skip link targeting CTA buttons", () => {
      const wrapper = mountPage();
      const skipLink = wrapper.find('a[href="#cta-buttons"]');
      expect(skipLink.exists()).toBe(true);
      expect(skipLink.text()).toBe("Skip to main content");
      expect(skipLink.classes()).toContain("sr-only");
    });

    it("CTA links have visible focus rings", () => {
      const wrapper = mountPage();
      const signInLink = wrapper
        .findAll("a")
        .find((a) => a.text().includes("Sign In"));
      expect(signInLink!.attributes("class")).toContain("focus:ring-2");
      expect(signInLink!.attributes("class")).toContain("focus:ring-white");
    });

    it("feature card icons have aria-hidden", () => {
      const wrapper = mountPage();
      const cards = wrapper.findAll(".bg-white\\/10");
      for (const card of cards) {
        expect(card.find("svg").attributes("aria-hidden")).toBe("true");
      }
    });

    it("decorative circles have aria-hidden", () => {
      const wrapper = mountPage();
      const circles = wrapper.findAll(".animate-pulse");
      for (const circle of circles) {
        expect(circle.attributes("aria-hidden")).toBe("true");
      }
    });

    it("decorative circles respect prefers-reduced-motion", () => {
      const wrapper = mountPage();
      const circles = wrapper.findAll(".animate-pulse");
      for (const circle of circles) {
        expect(circle.classes()).toContain("motion-reduce:animate-none");
      }
    });

    it("pattern overlay has aria-hidden", () => {
      const wrapper = mountPage();
      const overlay = wrapper.find("[aria-hidden='true'].opacity-5");
      expect(overlay.exists()).toBe(true);
    });
  });
});
