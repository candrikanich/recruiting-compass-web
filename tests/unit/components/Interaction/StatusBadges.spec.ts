import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import StatusBadges from "~/components/Interaction/StatusBadges.vue";
import Badge from "~/components/DesignSystem/Badge.vue";

describe("StatusBadges", () => {
  describe("Type Badge", () => {
    it("renders type badge with correct text", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
          sentiment: null,
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const badges = wrapper.findAllComponents(Badge);
      expect(badges.length).toBeGreaterThanOrEqual(2); // type + direction
      expect(wrapper.text()).toContain("email");
    });

    it("renders different type values correctly", () => {
      const types = [
        "email",
        "phone_call",
        "text",
        "in_person_visit",
        "virtual_meeting",
      ];

      types.forEach((type) => {
        const wrapper = mount(StatusBadges, {
          props: {
            type,
            direction: "outbound",
          },
          global: {
            components: {
              Badge,
            },
          },
        });

        expect(wrapper.text()).toContain(type);
      });
    });
  });

  describe("Direction Badge", () => {
    it("renders direction badge with correct text", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "inbound",
          sentiment: null,
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      expect(wrapper.text()).toContain("inbound");
    });

    it("renders outbound direction correctly", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      expect(wrapper.text()).toContain("outbound");
    });
  });

  describe("Sentiment Badge", () => {
    it("renders sentiment badge when sentiment is provided", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
          sentiment: "positive",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const badges = wrapper.findAllComponents(Badge);
      expect(badges.length).toBe(3); // type + direction + sentiment
      expect(wrapper.text()).toContain("positive");
    });

    it("does not render sentiment badge when sentiment is null", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
          sentiment: null,
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const badges = wrapper.findAllComponents(Badge);
      expect(badges.length).toBe(2); // type + direction only
    });

    it("does not render sentiment badge when sentiment is undefined", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const badges = wrapper.findAllComponents(Badge);
      expect(badges.length).toBe(2); // type + direction only
    });

    it("renders all sentiment values correctly", () => {
      const sentiments = ["very_positive", "positive", "neutral", "negative"];

      sentiments.forEach((sentiment) => {
        const wrapper = mount(StatusBadges, {
          props: {
            type: "email",
            direction: "outbound",
            sentiment,
          },
          global: {
            components: {
              Badge,
            },
          },
        });

        expect(wrapper.text()).toContain(sentiment);
      });
    });
  });

  describe("Badge Props", () => {
    it("passes variant='light' to all badges", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
          sentiment: "positive",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const badges = wrapper.findAllComponents(Badge);
      badges.forEach((badge) => {
        expect(badge.props("variant")).toBe("light");
      });
    });

    it("passes color prop to badges", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
          sentiment: "positive",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const badges = wrapper.findAllComponents(Badge);
      // Each badge should have a color prop
      badges.forEach((badge) => {
        expect(badge.props("color")).toBeDefined();
      });
    });
  });

  describe("Layout", () => {
    it("renders badges in a flex container with gap", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
          sentiment: "positive",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const container = wrapper.find("div");
      expect(container.classes()).toContain("flex");
      expect(container.classes()).toContain("gap-2");
    });

    it("renders badges in correct order: type, direction, sentiment", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "phone_call",
          direction: "inbound",
          sentiment: "neutral",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const badges = wrapper.findAllComponents(Badge);
      expect(badges[0].text()).toBe("phone_call");
      expect(badges[1].text()).toBe("inbound");
      expect(badges[2].text()).toBe("neutral");
    });

    it("renders only type and direction badges when no sentiment", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      const badges = wrapper.findAllComponents(Badge);
      expect(badges.length).toBe(2);
      expect(badges[0].text()).toBe("email");
      expect(badges[1].text()).toBe("outbound");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty string sentiment", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "email",
          direction: "outbound",
          sentiment: "",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      // Empty string is falsy, so should not render sentiment badge
      const badges = wrapper.findAllComponents(Badge);
      expect(badges.length).toBe(2);
    });

    it("renders with minimal props", () => {
      const wrapper = mount(StatusBadges, {
        props: {
          type: "text",
          direction: "inbound",
        },
        global: {
          components: {
            Badge,
          },
        },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain("text");
      expect(wrapper.text()).toContain("inbound");
    });
  });
});
