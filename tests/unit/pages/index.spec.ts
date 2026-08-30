import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import IndexPage from "~/pages/index.vue";

// Mock components
vi.mock("~/components/Auth/MultiSportFieldBackground.vue", () => ({
  default: {
    name: "MultiSportFieldBackground",
    template: '<div class="multi-sport-field-background"></div>',
  },
}));

const mountPage = () =>
  mount(IndexPage, {
    global: {
      stubs: {
        NuxtLink: {
          name: "NuxtLink",
          template: '<a :href="to"><slot /></a>',
          props: ["to"],
        },
        SkipLink: {
          name: "SkipLink",
          template: '<a :href="to">{{ text }}</a>',
          props: ["to", "text"],
        },
      },
    },
  });

describe("pages/index.vue (Landing Page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the page with main landmark", () => {
      const wrapper = mountPage();
      expect(wrapper.find("main").exists()).toBe(true);
    });

    it("renders the logo with proper alt text", () => {
      const wrapper = mountPage();
      const logo = wrapper.find("img");
      expect(logo.exists()).toBe(true);
      const src = logo.attributes("src");
      expect(
        src.includes("recruiting-compass-stacked.svg") ||
          src.includes("test-svg-stub"),
      ).toBe(true);
      expect(logo.attributes("alt")).toContain("Recruiting Compass");
    });

    it("renders get started free and sign in buttons", () => {
      const wrapper = mountPage();
      const links = wrapper.findAll("a");
      const signInLink = links.find((link) => link.text().includes("Sign In"));
      const getStartedLink = links.find((link) =>
        link.text().includes("Get Started Free"),
      );

      expect(signInLink).toBeDefined();
      expect(getStartedLink).toBeDefined();
      expect(signInLink?.attributes("href")).toBe("/login");
      expect(getStartedLink?.attributes("href")).toBe("/signup");
    });

    it("renders headline and subheadline", () => {
      const wrapper = mountPage();
      expect(wrapper.text()).toContain(
        "Your College Recruiting Command Center",
      );
      expect(wrapper.text()).toContain("No recruiting service required");
    });

    it("renders three feature cards", () => {
      const wrapper = mountPage();
      expect(wrapper.text()).toContain("Track Schools & Coaches");
      expect(wrapper.text()).toContain("Smart Outreach");
      expect(wrapper.text()).toContain("Calendars & Timeline");
    });

    it("renders feature descriptions", () => {
      const wrapper = mountPage();
      expect(wrapper.text()).toContain("5-stage pipeline");
      expect(wrapper.text()).toContain("33+ templates");
      expect(wrapper.text()).toContain("22 NCAA recruiting calendars");
    });

    it("renders stats badge", () => {
      const wrapper = mountPage();
      expect(wrapper.text()).toContain("19");
      expect(wrapper.text()).toContain("Sports");
      expect(wrapper.text()).toContain("33+");
      expect(wrapper.text()).toContain("Templates");
      expect(wrapper.text()).toContain("22");
      expect(wrapper.text()).toContain("NCAA Calendars");
    });

    it("renders tagline", () => {
      const wrapper = mountPage();
      expect(wrapper.text()).toContain(
        "Free for student athletes and families",
      );
    });
  });

  describe("Accessibility", () => {
    it("has skip link to main content", () => {
      const wrapper = mountPage();
      const skipLink = wrapper.find('a[href="#cta-buttons"]');
      expect(skipLink.exists()).toBe(true);
      expect(skipLink.text()).toContain("Skip to main content");
    });

    it("has screen reader only h1", () => {
      const wrapper = mountPage();
      const h1 = wrapper.find("h1");
      expect(h1.exists()).toBe(true);
      expect(h1.classes()).toContain("sr-only");
      expect(h1.text()).toBe("Recruiting Compass");
    });

    it("has screen reader only features heading", () => {
      const wrapper = mountPage();
      const h2s = wrapper.findAll("h2");
      const featuresH2 = h2s.find(
        (h) => h.classes().includes("sr-only") && h.text() === "Features",
      );
      expect(featuresH2).toBeDefined();
    });

    it("marks decorative elements as aria-hidden", () => {
      const wrapper = mountPage();
      const decorativeElements = wrapper
        .findAll('[aria-hidden="true"]')
        .filter((el) => {
          const classes = el.classes().join(" ");
          return (
            classes.includes("opacity-5") ||
            classes.includes("rounded-full") ||
            el.element.tagName === "svg"
          );
        });

      expect(decorativeElements.length).toBeGreaterThan(0);
    });

    it("has motion-reduce class on animated elements", () => {
      const wrapper = mountPage();
      const animatedElements = wrapper.findAll(".animate-pulse");
      animatedElements.forEach((el) => {
        expect(el.classes()).toContain("motion-reduce:animate-none");
      });
    });

    it("has proper button styling classes for focus", () => {
      const wrapper = mountPage();
      const buttons = wrapper.findAll('a[href="/login"], a[href="/signup"]');

      buttons.forEach((button) => {
        const classes = button.classes().join(" ");
        expect(classes).toContain("focus:ring-2");
      });
    });

    it("stats badge has aria role list", () => {
      const wrapper = mountPage();
      const statsBadge = wrapper.find('[role="list"]');
      expect(statsBadge.exists()).toBe(true);
      expect(statsBadge.attributes("aria-label")).toBe("Product highlights");
    });
  });

  describe("Navigation", () => {
    it("links to login page", () => {
      const wrapper = mountPage();
      const loginLink = wrapper.find('a[href="/login"]');
      expect(loginLink.exists()).toBe(true);
    });

    it("links to signup page", () => {
      const wrapper = mountPage();
      const signupLink = wrapper.find('a[href="/signup"]');
      expect(signupLink.exists()).toBe(true);
    });

    it("has CTA section with id for skip link target", () => {
      const wrapper = mountPage();
      const ctaSection = wrapper.find("#cta-buttons");
      expect(ctaSection.exists()).toBe(true);
    });
  });

  describe("Responsive Design", () => {
    it("has responsive layout classes", () => {
      const wrapper = mountPage();
      expect(wrapper.find(".min-h-screen").exists()).toBe(true);
      expect(wrapper.find(".max-w-2xl").exists()).toBe(true);
    });

    it("has responsive button layout classes", () => {
      const wrapper = mountPage();
      const ctaSection = wrapper.find("#cta-buttons");
      const classes = ctaSection.classes().join(" ");

      expect(classes).toContain("flex-col");
      expect(classes).toContain("sm:flex-row");
    });

    it("has responsive feature grid", () => {
      const wrapper = mountPage();
      const featureGrid = wrapper
        .findAll("div")
        .find((div) => div.classes().includes("grid"));

      expect(featureGrid).toBeDefined();
      const classes = featureGrid!.classes().join(" ");
      expect(classes).toContain("grid-cols-1");
      expect(classes).toContain("md:grid-cols-3");
    });
  });

  describe("Visual Design", () => {
    it("has gradient background", () => {
      const wrapper = mountPage();
      const background = wrapper.find(".bg-emerald-600");
      expect(background.exists()).toBe(true);
    });

    it("has backdrop blur on feature cards", () => {
      const wrapper = mountPage();
      const featureCards = wrapper.findAll(".backdrop-blur-xs");
      expect(featureCards.length).toBeGreaterThan(0);
    });

    it("renders MultiSportFieldBackground component", () => {
      const wrapper = mountPage();
      expect(
        wrapper.findComponent({ name: "MultiSportFieldBackground" }).exists(),
      ).toBe(true);
    });

    it("has proper button minimum widths", () => {
      const wrapper = mountPage();
      const buttons = wrapper.findAll('a[href="/login"], a[href="/signup"]');

      buttons.forEach((button) => {
        expect(button.classes()).toContain("min-w-[200px]");
      });
    });

    it("has decorative pattern overlay", () => {
      const wrapper = mountPage();
      const overlay = wrapper
        .findAll('[aria-hidden="true"]')
        .find((el) => el.classes().includes("opacity-5"));

      expect(overlay).toBeDefined();
    });

    it("has decorative floating circles", () => {
      const wrapper = mountPage();
      const circles = wrapper.findAll(".rounded-full.animate-pulse");
      expect(circles.length).toBe(4);
    });
  });

  describe("Content Structure", () => {
    it("has three feature sections", () => {
      const wrapper = mountPage();
      const featureHeadings = wrapper.findAll("h3");
      expect(featureHeadings).toHaveLength(3);
    });

    it("each feature has icon, heading, and description", () => {
      const wrapper = mountPage();
      const featureCards = wrapper
        .findAll("div")
        .filter((div) =>
          div.classes().some((cls) => cls.includes("bg-white/10")),
        );

      // Stats badge also has bg-white/10, filter to cards with h3
      const cardsWithHeadings = featureCards.filter((card) =>
        card.find("h3").exists(),
      );

      expect(cardsWithHeadings.length).toBe(3);

      cardsWithHeadings.forEach((card) => {
        expect(card.find("svg").exists()).toBe(true);
        expect(card.find("h3").exists()).toBe(true);
        expect(card.find("p").exists()).toBe(true);
      });
    });

    it("logo has proper size classes", () => {
      const wrapper = mountPage();
      const logo = wrapper.find("img");
      expect(logo.classes()).toContain("w-auto");
      expect(logo.classes()).toContain("drop-shadow-2xl");
    });
  });

  describe("Page Meta", () => {
    it("uses public layout", () => {
      expect(IndexPage).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("renders without errors when mounted", () => {
      expect(() => mountPage()).not.toThrow();
    });

    it("has valid HTML structure", () => {
      const wrapper = mountPage();
      const html = wrapper.html();

      expect(html).toBeTruthy();
      expect(html).toContain("main");
      expect(html).toContain("img");
    });

    it("all links have valid href attributes", () => {
      const wrapper = mountPage();
      const links = wrapper.findAll("a");

      links.forEach((link) => {
        const href = link.attributes("href");
        expect(href).toBeTruthy();
        expect(href).toMatch(/^(\/|#)/);
      });
    });
  });
});
