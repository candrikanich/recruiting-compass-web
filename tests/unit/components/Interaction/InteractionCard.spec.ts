import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import InteractionCard from "~/components/Interaction/InteractionCard.vue";
import LoggedByBadge from "~/components/Interaction/LoggedByBadge.vue";
import type { Interaction } from "~/types/models";
import {
  CalendarIcon,
  PaperClipIcon,
  EnvelopeIcon,
} from "@heroicons/vue/24/outline";

vi.mock("@heroicons/vue/24/outline", () => ({
  CalendarIcon: { name: "CalendarIcon", template: "<svg />" },
  PaperClipIcon: { name: "PaperClipIcon", template: "<svg />" },
  EnvelopeIcon: { name: "EnvelopeIcon", template: "<svg />" },
  ChatBubbleLeftIcon: {
    name: "ChatBubbleLeftIcon",
    template: "<svg />",
  },
  PhoneIcon: { name: "PhoneIcon", template: "<svg />" },
  VideoCameraIcon: { name: "VideoCameraIcon", template: "<svg />" },
  UserGroupIcon: { name: "UserGroupIcon", template: "<svg />" },
}));

describe("InteractionCard", () => {
  const mockInteraction: Interaction = {
    id: "int-1",
    school_id: "school-1",
    coach_id: "coach-1",
    type: "email",
    direction: "outbound",
    subject: "Test Subject",
    content: "This is a test interaction content that should be displayed.",
    sentiment: "positive",
    occurred_at: "2024-01-15T10:30:00Z",
    created_at: "2024-01-15T10:30:00Z",
    logged_by: "user-1",
    attachments: ["file1.pdf", "file2.doc"],
    user_id: "user-1",
  };

  const defaultProps = {
    interaction: mockInteraction,
    schoolName: "University of Test",
    coachName: "Coach Smith",
    currentUserId: "user-2",
    isParent: false,
  };

  it("renders interaction card with all props", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
          CalendarIcon,
          PaperClipIcon,
          EnvelopeIcon,
        },
      },
    });

    expect(wrapper.find(".font-semibold.text-slate-900").text()).toBe("Email");
    expect(wrapper.html()).toContain("Outbound");
    expect(wrapper.html()).toContain("Test Subject");
    expect(wrapper.html()).toContain("University of Test");
    expect(wrapper.html()).toContain("Coach Smith");
    expect(wrapper.html()).toContain(
      "This is a test interaction content that should be displayed.",
    );
    expect(wrapper.html()).toContain("Positive");
  });

  it("displays correct direction badge for outbound interaction", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
          CalendarIcon,
          PaperClipIcon,
          EnvelopeIcon,
        },
      },
    });

    const directionBadge = wrapper.find(".bg-blue-100.text-blue-900");
    expect(directionBadge.exists()).toBe(true);
    expect(directionBadge.text()).toBe("Outbound");
  });

  it("displays correct direction badge for inbound interaction", () => {
    const inboundInteraction = {
      ...mockInteraction,
      direction: "inbound" as const,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: inboundInteraction,
      },
      global: {
        components: {
          LoggedByBadge,
          CalendarIcon,
          PaperClipIcon,
          EnvelopeIcon,
        },
      },
    });

    const directionBadge = wrapper.find(".bg-emerald-100.text-emerald-900");
    expect(directionBadge.exists()).toBe(true);
    expect(directionBadge.text()).toBe("Inbound");
  });

  it("renders LoggedByBadge when logged_by is present", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const badge = wrapper.findComponent(LoggedByBadge);
    expect(badge.exists()).toBe(true);
    expect(badge.props("loggedByUserId")).toBe("user-1");
    expect(badge.props("currentUserId")).toBe("user-2");
  });

  it("does not render LoggedByBadge when logged_by is null", () => {
    const interactionWithoutLoggedBy = {
      ...mockInteraction,
      logged_by: undefined,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: interactionWithoutLoggedBy,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const badge = wrapper.findComponent(LoggedByBadge);
    expect(badge.exists()).toBe(false);
  });

  it("displays sentiment badge when sentiment is present", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const sentimentBadge = wrapper.find(".bg-blue-100.text-blue-900");
    expect(sentimentBadge.exists()).toBe(true);
    expect(wrapper.html()).toContain("Positive");
  });

  it("does not display sentiment badge when sentiment is null", () => {
    const interactionWithoutSentiment = {
      ...mockInteraction,
      sentiment: null,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: interactionWithoutSentiment,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    expect(wrapper.html()).not.toContain("Positive");
    expect(wrapper.html()).not.toContain("Neutral");
    expect(wrapper.html()).not.toContain("Negative");
  });

  it("displays subject when present", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const subject = wrapper.find(".text-slate-900.font-medium.truncate");
    expect(subject.exists()).toBe(true);
    expect(subject.text()).toBe("Test Subject");
  });

  it("does not display subject when null", () => {
    const interactionWithoutSubject = {
      ...mockInteraction,
      subject: null,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: interactionWithoutSubject,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const subject = wrapper.find(".text-slate-900.font-medium.truncate");
    expect(subject.exists()).toBe(false);
  });

  it("displays coach name when provided", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    expect(wrapper.html()).toContain("University of Test");
    expect(wrapper.html()).toContain("Coach Smith");
  });

  it("does not display coach name when not provided", () => {
    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        coachName: undefined,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    expect(wrapper.html()).toContain("University of Test");
    expect(wrapper.html()).not.toContain("Coach Smith");
    expect(wrapper.html()).not.toContain("&bull;");
  });

  it("displays content preview when present", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const content = wrapper.find(".text-sm.text-slate-600.mt-2.line-clamp-2");
    expect(content.exists()).toBe(true);
    expect(content.text()).toBe(
      "This is a test interaction content that should be displayed.",
    );
  });

  it("does not display content when null", () => {
    const interactionWithoutContent = {
      ...mockInteraction,
      content: null,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: interactionWithoutContent,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const content = wrapper.find(".text-sm.text-slate-600.mt-2.line-clamp-2");
    expect(content.exists()).toBe(false);
  });

  it("displays formatted date from occurred_at", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
          CalendarIcon,
        },
      },
    });

    expect(wrapper.html()).toContain("Jan 15, 2024");
  });

  it("displays formatted date from created_at when occurred_at is null", () => {
    const interactionWithoutOccurredAt = {
      ...mockInteraction,
      occurred_at: undefined,
      created_at: "2024-02-20T14:00:00Z",
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: interactionWithoutOccurredAt,
      },
      global: {
        components: {
          LoggedByBadge,
          CalendarIcon,
        },
      },
    });

    expect(wrapper.html()).toContain("Feb 20, 2024");
  });

  it("displays attachments count when attachments are present", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
          PaperClipIcon,
        },
      },
    });

    expect(wrapper.html()).toContain("2 file(s)");
  });

  it("does not display attachments when array is empty", () => {
    const interactionWithoutAttachments = {
      ...mockInteraction,
      attachments: [],
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: interactionWithoutAttachments,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    expect(wrapper.html()).not.toContain("file(s)");
  });

  it("does not display attachments when undefined", () => {
    const interactionWithoutAttachments = {
      ...mockInteraction,
      attachments: undefined,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: interactionWithoutAttachments,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    expect(wrapper.html()).not.toContain("file(s)");
  });

  it("emits view event when View button is clicked", async () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const viewButton = wrapper.find("button");
    expect(viewButton.exists()).toBe(true);
    expect(viewButton.text()).toBe("View");

    await viewButton.trigger("click");

    expect(wrapper.emitted("view")).toBeTruthy();
    expect(wrapper.emitted("view")?.[0]).toEqual([mockInteraction]);
  });

  it("displays correct type icon and colors for email", () => {
    const wrapper = mount(InteractionCard, {
      props: defaultProps,
      global: {
        components: {
          LoggedByBadge,
          EnvelopeIcon,
        },
      },
    });

    const iconContainer = wrapper.find(".bg-blue-100");
    expect(iconContainer.exists()).toBe(true);
  });

  it("displays correct type icon and colors for phone_call", () => {
    const phoneInteraction = {
      ...mockInteraction,
      type: "phone_call" as const,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: phoneInteraction,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const iconContainer = wrapper.find(".bg-purple-100");
    expect(iconContainer.exists()).toBe(true);
    expect(wrapper.html()).toContain("Phone Call");
  });

  it("renders correctly with minimal interaction data", () => {
    const minimalInteraction: Interaction = {
      id: "int-2",
      school_id: "school-2",
      type: "text",
      direction: "inbound",
      created_at: "2024-01-01T00:00:00Z",
      user_id: "user-1",
    };

    const wrapper = mount(InteractionCard, {
      props: {
        interaction: minimalInteraction,
        schoolName: "Test School",
        currentUserId: "user-1",
        isParent: false,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    expect(wrapper.find(".font-semibold.text-slate-900").text()).toBe("Text");
    expect(wrapper.html()).toContain("Test School");
    expect(wrapper.html()).toContain("Inbound");
  });

  it("applies correct sentiment badge classes for very_positive", () => {
    const veryPositiveInteraction = {
      ...mockInteraction,
      sentiment: "very_positive" as const,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: veryPositiveInteraction,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const sentimentBadge = wrapper.find(".bg-emerald-100.text-emerald-900");
    expect(sentimentBadge.exists()).toBe(true);
    expect(sentimentBadge.text()).toBe("Very Positive");
  });

  it("applies correct sentiment badge classes for negative", () => {
    const negativeInteraction = {
      ...mockInteraction,
      sentiment: "negative" as const,
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: negativeInteraction,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    const sentimentBadge = wrapper.find(".bg-red-100.text-red-900");
    expect(sentimentBadge.exists()).toBe(true);
    expect(sentimentBadge.text()).toBe("Negative");
  });

  it("applies correct sentiment badge classes for neutral", () => {
    const neutralInteraction = {
      ...mockInteraction,
      sentiment: "neutral" as const,
      logged_by: undefined, // Remove logged_by to avoid confusion with LoggedByBadge
    };

    const wrapper = mount(InteractionCard, {
      props: {
        ...defaultProps,
        interaction: neutralInteraction,
      },
      global: {
        components: {
          LoggedByBadge,
        },
      },
    });

    expect(wrapper.html()).toContain("Neutral");
    const sentimentBadge = wrapper.find(".bg-slate-100.text-slate-900");
    expect(sentimentBadge.exists()).toBe(true);
    expect(sentimentBadge.text()).toBe("Neutral");
  });

  describe("Accessibility", () => {
    it("has proper focus indicators on View button", () => {
      const wrapper = mount(InteractionCard, {
        props: defaultProps,
        global: {
          components: {
            LoggedByBadge,
          },
        },
      });

      const viewButton = wrapper.find("button");
      expect(viewButton.classes()).toContain("focus:outline-2");
      expect(viewButton.classes()).toContain("focus:outline-blue-600");
      expect(viewButton.classes()).toContain("focus:outline-offset-1");
      expect(viewButton.classes()).not.toContain("focus:outline-none");
    });

    it("has accessible name on View button with subject", () => {
      const wrapper = mount(InteractionCard, {
        props: defaultProps,
        global: {
          components: {
            LoggedByBadge,
          },
        },
      });

      const viewButton = wrapper.find("button");
      expect(viewButton.attributes("aria-label")).toBe(
        "View details for Test Subject",
      );
    });

    it("has generic accessible name on View button without subject", () => {
      const interactionWithoutSubject = {
        ...mockInteraction,
        subject: null,
      };

      const wrapper = mount(InteractionCard, {
        props: {
          ...defaultProps,
          interaction: interactionWithoutSubject,
        },
        global: {
          components: {
            LoggedByBadge,
          },
        },
      });

      const viewButton = wrapper.find("button");
      expect(viewButton.attributes("aria-label")).toBe(
        "View interaction details",
      );
    });

    it("has minimum touch target size on View button", () => {
      const wrapper = mount(InteractionCard, {
        props: defaultProps,
        global: {
          components: {
            LoggedByBadge,
          },
        },
      });

      const viewButton = wrapper.find("button");
      expect(viewButton.classes()).toContain("min-h-[44px]");
      expect(viewButton.classes()).toContain("px-4");
      expect(viewButton.classes()).toContain("py-2.5");
    });

    it("marks decorative icons with aria-hidden", () => {
      const wrapper = mount(InteractionCard, {
        props: defaultProps,
        global: {
          components: {
            LoggedByBadge,
            CalendarIcon,
            PaperClipIcon,
            EnvelopeIcon,
          },
        },
      });

      const html = wrapper.html();

      const ariaHiddenMatches = html.match(/aria-hidden="true"/g);
      expect(ariaHiddenMatches).toBeTruthy();
      expect(ariaHiddenMatches?.length).toBeGreaterThanOrEqual(3);
    });
  });
});
