import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";

let turnstileSiteKey = "";
vi.mock("#app", () => ({
  useRuntimeConfig: () => ({
    public: { turnstileSiteKey },
  }),
}));

vi.stubGlobal("$fetch", vi.fn());

import ExpressInterestPopover from "~/components/profile/public/ExpressInterestPopover.vue";

const baseProps = {
  slug: "owen-a",
  playerName: "Owen A",
};

describe("ExpressInterestPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    turnstileSiteKey = "";
  });

  it("renders a free-text School / Program input (no dropdown that leaks the athlete's schools)", () => {
    const w = mount(ExpressInterestPopover, { props: baseProps });
    expect(w.find("[data-test='program-input']").exists()).toBe(true);
    expect(w.find("[data-test='program-select']").exists()).toBe(false);
  });

  it("renders a visually-hidden honeypot input named hp", () => {
    const w = mount(ExpressInterestPopover, { props: baseProps });
    const hp = w.find("input[name='hp']");
    expect(hp.exists()).toBe(true);
    expect(hp.attributes("autocomplete")).toBe("off");
    expect(hp.attributes("tabindex")).toBe("-1");
    expect(hp.attributes("aria-hidden")).toBe("true");
  });

  it("does not render a Turnstile widget when no site key is configured", () => {
    const w = mount(ExpressInterestPopover, { props: baseProps });
    expect(w.find("[data-test='turnstile-widget']").exists()).toBe(false);
  });

  it("renders a Turnstile widget container when a site key is configured", () => {
    turnstileSiteKey = "test-site-key";
    const w = mount(ExpressInterestPopover, { props: baseProps });
    expect(w.find("[data-test='turnstile-widget']").exists()).toBe(true);
  });

  it("submits the expected body with an empty honeypot and shows the confirmation state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("$fetch", fetchMock);

    const w = mount(ExpressInterestPopover, { props: baseProps });

    await w.find("[data-test='program-input']").setValue("Baseball - SS");
    await w.find("[data-test='note']").setValue("Loved your film.");
    await w.find("[data-test='coach-name']").setValue("Coach Smith");
    await w.find("[data-test='coach-email']").setValue("coach@state.edu");

    await w.find("form").trigger("submit");
    await w.vm.$nextTick();
    await w.vm.$nextTick();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/profile/owen-a/interest",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          program: "Baseball - SS",
          note: "Loved your film.",
          coachName: "Coach Smith",
          coachEmail: "coach@state.edu",
          hp: "",
        }),
      }),
    );

    expect(w.text()).toContain(
      "The player has been notified of your interest",
    );
    expect(w.emitted().submitted).toBeTruthy();
  });

  it("requires a program value before submitting", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("$fetch", fetchMock);

    const w = mount(ExpressInterestPopover, { props: baseProps });
    await w.find("form").trigger("submit");
    await w.vm.$nextTick();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an inline error when submission fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("$fetch", fetchMock);

    const w = mount(ExpressInterestPopover, { props: baseProps });
    await w.find("[data-test='program-input']").setValue("Baseball - SS");
    await w.find("form").trigger("submit");
    await w.vm.$nextTick();
    await w.vm.$nextTick();

    expect(w.find("[data-test='submit-error']").exists()).toBe(true);
  });

  it("shows a friendly rate-limit message on a 429 response", async () => {
    const fetchMock = vi.fn().mockRejectedValue({ statusCode: 429 });
    vi.stubGlobal("$fetch", fetchMock);

    const w = mount(ExpressInterestPopover, { props: baseProps });
    await w.find("[data-test='program-input']").setValue("Baseball - SS");
    await w.find("form").trigger("submit");
    await w.vm.$nextTick();
    await w.vm.$nextTick();

    expect(w.find("[data-test='submit-error']").text()).toContain(
      "try again shortly",
    );
  });

  it("emits close when the close button is clicked", async () => {
    const w = mount(ExpressInterestPopover, { props: baseProps });
    await w.find("[data-test='popover-close']").trigger("click");
    expect(w.emitted().close).toBeTruthy();
  });

  it("renders a native <dialog> and emits close on Escape (cancel event)", async () => {
    const w = mount(ExpressInterestPopover, { props: baseProps });
    expect(w.find("dialog").exists()).toBe(true);
    await w.find("dialog").trigger("cancel");
    expect(w.emitted().close).toBeTruthy();
  });

  describe("Turnstile widget render + reset", () => {
    afterEach(() => {
      delete (window as unknown as { turnstile?: unknown }).turnstile;
    });

    it("renders the widget with action: 'interest' when a site key is configured", async () => {
      turnstileSiteKey = "test-site-key";
      const renderMock = vi.fn().mockReturnValue("widget-1");
      (window as unknown as { turnstile: unknown }).turnstile = {
        render: renderMock,
        reset: vi.fn(),
      };

      mount(ExpressInterestPopover, { props: baseProps });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(renderMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sitekey: "test-site-key",
          action: "interest",
        }),
      );
    });

    it("resets the widget and clears the token when a submit fails", async () => {
      turnstileSiteKey = "test-site-key";
      const resetMock = vi.fn();
      let capturedCallback: ((token: string) => void) | undefined;
      const renderMock = vi.fn((_el, options) => {
        capturedCallback = options.callback;
        return "widget-1";
      });
      (window as unknown as { turnstile: unknown }).turnstile = {
        render: renderMock,
        reset: resetMock,
      };

      const fetchMock = vi.fn().mockRejectedValue(new Error("boom"));
      vi.stubGlobal("$fetch", fetchMock);

      const w = mount(ExpressInterestPopover, { props: baseProps });
      await new Promise((resolve) => setTimeout(resolve, 0));
      capturedCallback?.("spent-token");
      await w.vm.$nextTick();

      await w.find("[data-test='program-input']").setValue("Baseball - SS");
      await w.find("form").trigger("submit");
      await w.vm.$nextTick();
      await w.vm.$nextTick();

      expect(resetMock).toHaveBeenCalledWith("widget-1");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.objectContaining({ turnstileToken: "spent-token" }),
        }),
      );
    });
  });
});
