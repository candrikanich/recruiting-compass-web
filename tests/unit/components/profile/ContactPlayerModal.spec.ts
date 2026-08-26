import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

let turnstileSiteKey = "";
vi.mock("#app", () => ({
  useRuntimeConfig: () => ({
    public: { turnstileSiteKey },
  }),
}));

vi.stubGlobal("$fetch", vi.fn());

import ContactPlayerModal from "~/components/profile/public/ContactPlayerModal.vue";

const baseProps = {
  slug: "owen-a",
  playerName: "Owen A",
};

describe("ContactPlayerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    turnstileSiteKey = "";
  });

  it("renders the coach name, title, school, email, and note fields", () => {
    const w = mount(ContactPlayerModal, { props: baseProps });
    expect(w.find("[data-test='coach-name']").exists()).toBe(true);
    expect(w.find("[data-test='coach-title']").exists()).toBe(true);
    expect(w.find("[data-test='school-name']").exists()).toBe(true);
    expect(w.find("[data-test='coach-email']").exists()).toBe(true);
    expect(w.find("[data-test='note']").exists()).toBe(true);
  });

  it("renders a visually-hidden honeypot input named hp", () => {
    const w = mount(ContactPlayerModal, { props: baseProps });
    const hp = w.find("input[name='hp']");
    expect(hp.exists()).toBe(true);
    expect(hp.attributes("autocomplete")).toBe("off");
    expect(hp.attributes("tabindex")).toBe("-1");
    expect(hp.attributes("aria-hidden")).toBe("true");
  });

  it("does not render a Turnstile widget when no site key is configured", () => {
    const w = mount(ContactPlayerModal, { props: baseProps });
    expect(w.find("[data-test='turnstile-widget']").exists()).toBe(false);
  });

  it("renders a Turnstile widget container when a site key is configured", async () => {
    turnstileSiteKey = "test-site-key";
    const w = mount(ContactPlayerModal, { props: baseProps });
    expect(w.find("[data-test='turnstile-widget']").exists()).toBe(true);
  });

  it("submits the expected body with an empty honeypot and shows the confirmation state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("$fetch", fetchMock);

    const w = mount(ContactPlayerModal, { props: baseProps });

    await w.find("[data-test='coach-name']").setValue("Coach Smith");
    await w.find("[data-test='coach-title']").setValue("Head Coach");
    await w.find("[data-test='school-name']").setValue("State University");
    await w.find("[data-test='coach-email']").setValue("coach@state.edu");
    await w.find("[data-test='note']").setValue("Loved your film, reach out.");

    await w.find("form").trigger("submit");
    await w.vm.$nextTick();
    await w.vm.$nextTick();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/profile/owen-a/contact",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          coachName: "Coach Smith",
          coachTitle: "Head Coach",
          schoolName: "State University",
          schoolId: undefined,
          coachEmail: "coach@state.edu",
          note: "Loved your film, reach out.",
          hp: "",
        }),
      }),
    );

    expect(w.text()).toContain(
      "The player will be notified and can respond directly",
    );
    expect(w.emitted().submitted).toBeTruthy();
  });

  it("sets schoolId only when the typed school exactly matches a provided school by name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("$fetch", fetchMock);

    const w = mount(ContactPlayerModal, {
      props: {
        ...baseProps,
        schools: [{ id: "school-123", name: "State University" }],
      },
    });

    await w.find("[data-test='coach-name']").setValue("Coach Smith");
    await w.find("[data-test='school-name']").setValue("State University");
    await w.find("[data-test='note']").setValue("Great highlight reel.");

    await w.find("form").trigger("submit");
    await w.vm.$nextTick();
    await w.vm.$nextTick();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/profile/owen-a/contact",
      expect.objectContaining({
        body: expect.objectContaining({
          schoolId: "school-123",
          schoolName: "State University",
        }),
      }),
    );
  });

  it("shows an inline error when submission fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("$fetch", fetchMock);

    const w = mount(ContactPlayerModal, { props: baseProps });
    await w.find("[data-test='coach-name']").setValue("Coach Smith");
    await w.find("[data-test='note']").setValue("Note text here.");
    await w.find("form").trigger("submit");
    await w.vm.$nextTick();
    await w.vm.$nextTick();

    expect(w.find("[data-test='submit-error']").exists()).toBe(true);
  });

  it("shows a friendly rate-limit message on a 429 response", async () => {
    const fetchMock = vi.fn().mockRejectedValue({ statusCode: 429 });
    vi.stubGlobal("$fetch", fetchMock);

    const w = mount(ContactPlayerModal, { props: baseProps });
    await w.find("[data-test='coach-name']").setValue("Coach Smith");
    await w.find("[data-test='note']").setValue("Note text here.");
    await w.find("form").trigger("submit");
    await w.vm.$nextTick();
    await w.vm.$nextTick();

    expect(w.find("[data-test='submit-error']").text()).toContain(
      "try again shortly",
    );
  });

  it("emits close when the close button is clicked", async () => {
    const w = mount(ContactPlayerModal, { props: baseProps });
    await w.find("[data-test='modal-close']").trigger("click");
    expect(w.emitted().close).toBeTruthy();
  });
});
