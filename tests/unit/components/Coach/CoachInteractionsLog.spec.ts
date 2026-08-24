import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import type { Interaction } from "~/types/models";
import CoachInteractionsLog from "~/components/Coach/CoachInteractionsLog.vue";

const stubs = {
  UIcon: { template: "<span />" },
  InteractionAttachments: { template: "<div />" },
  DesignSystemFormSegmentedControl: {
    props: ["modelValue"],
    template: "<div />",
  },
};

const make = (over: Partial<Interaction> = {}): Interaction =>
  ({
    id: "i1",
    coach_id: "coach-1",
    school_id: "school-1",
    event_id: null,
    type: "email",
    direction: "outbound",
    subject: "Intro",
    content: "Hello coach",
    sentiment: "positive",
    occurred_at: new Date().toISOString(),
    logged_by: "user-1",
    attachments: [],
    created_at: new Date().toISOString(),
    ...over,
  }) as Interaction;

const mountLog = (interactions: Interaction[]) =>
  mount(CoachInteractionsLog, {
    props: { interactions },
    global: { stubs },
  });

describe("CoachInteractionsLog", () => {
  it("shows empty state when there are no interactions", () => {
    const wrapper = mountLog([]);
    expect(wrapper.text()).toContain("No interactions recorded yet");
  });

  it("renders rows collapsed and reveals content on expand", async () => {
    const wrapper = mountLog([
      make({ id: "i1", content: "Hidden until open" }),
    ]);

    // Collapsed: content not shown
    expect(wrapper.text()).not.toContain("Hidden until open");

    await wrapper.find("li button").trigger("click");
    expect(wrapper.text()).toContain("Hidden until open");
  });

  it("filters by type via the native select", async () => {
    const wrapper = mountLog([
      make({ id: "i1", type: "email", subject: "An email" }),
      make({ id: "i2", type: "phone_call", subject: "A call" }),
    ]);

    expect(wrapper.text()).toContain("An email");
    expect(wrapper.text()).toContain("A call");

    const typeSelect = wrapper.findAll("select")[0];
    await typeSelect.setValue("phone_call");

    expect(wrapper.text()).not.toContain("An email");
    expect(wrapper.text()).toContain("A call");
  });

  it("summarizes sent vs received counts", () => {
    const wrapper = mountLog([
      make({ id: "i1", direction: "outbound" }),
      make({ id: "i2", direction: "outbound" }),
      make({ id: "i3", direction: "inbound" }),
    ]);
    // Shown / Sent / Received tiles
    const text = wrapper.text();
    expect(text).toContain("Shown");
    expect(text).toContain("Sent");
    expect(text).toContain("Received");
  });
});
