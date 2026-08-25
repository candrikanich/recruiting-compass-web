import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachAlerts from "~/components/Coach/detail/CoachAlerts.vue";

describe("CoachAlerts", () => {
  it("shows the overdue banner when overdue", () => {
    const w = mount(CoachAlerts, {
      props: {
        overdue: true,
        daysSinceContact: 64,
        channelPreference: false,
        preferredChannel: null,
      },
    });
    expect(w.text()).toContain("Outreach Overdue");
    expect(w.text()).toContain("64");
  });

  it("hides the overdue banner when not overdue", () => {
    const w = mount(CoachAlerts, {
      props: {
        overdue: false,
        daysSinceContact: 3,
        channelPreference: false,
        preferredChannel: null,
      },
    });
    expect(w.text()).not.toContain("Outreach Overdue");
  });

  it("shows the channel-preference banner when set", () => {
    const w = mount(CoachAlerts, {
      props: {
        overdue: false,
        daysSinceContact: 3,
        channelPreference: true,
        preferredChannel: "phone_call",
      },
    });
    expect(w.text()).toContain("Channel Preference");
  });
});
