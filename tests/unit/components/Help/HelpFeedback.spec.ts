import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import HelpFeedback from "~/components/Help/HelpFeedback.vue";

// useRoute is a Nuxt auto-import global — add it alongside setup.ts globals
vi.stubGlobal("useRoute", () => ({ path: "/help/schools" }));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

describe("HelpFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("renders thumbs up and thumbs down buttons initially", () => {
    const wrapper = mount(HelpFeedback);
    expect(wrapper.text()).toContain("Was this page helpful?");
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text()).toContain("Yes");
    expect(buttons[1].text()).toContain("No");
  });

  it("shows confirmation after thumbs up click", async () => {
    const wrapper = mount(HelpFeedback);
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Thanks for your feedback!");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });

  it("shows confirmation after thumbs down click", async () => {
    const wrapper = mount(HelpFeedback);
    await wrapper.findAll("button")[1].trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Thanks for your feedback!");
  });

  it("POSTs to /api/help/feedback with correct payload on thumbs up", async () => {
    const wrapper = mount(HelpFeedback);
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();
    expect(mockFetch).toHaveBeenCalledWith("/api/help/feedback", {
      method: "POST",
      body: { page: "/help/schools", helpful: true },
    });
  });

  it("POSTs helpful: false on thumbs down", async () => {
    const wrapper = mount(HelpFeedback);
    await wrapper.findAll("button")[1].trigger("click");
    await flushPromises();
    expect(mockFetch).toHaveBeenCalledWith("/api/help/feedback", {
      method: "POST",
      body: { page: "/help/schools", helpful: false },
    });
  });

  it("still shows confirmation even when API call fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const wrapper = mount(HelpFeedback);
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();
    // Feedback is non-critical — should show success regardless
    expect(wrapper.text()).toContain("Thanks for your feedback!");
  });

  it("renders support link with correct mailto href", () => {
    const wrapper = mount(HelpFeedback);
    const link = wrapper.find('a[href^="mailto:"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("mailto:support@therecruitingcompass.com");
  });
});
