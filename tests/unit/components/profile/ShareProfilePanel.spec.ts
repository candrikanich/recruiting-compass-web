import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ShareProfilePanel from "../../../../components/profile/setup/ShareProfilePanel.vue";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake"),
  },
}));

describe("ShareProfilePanel", () => {
  it("builds share links from the url and renders a QR image", async () => {
    const w = mount(ShareProfilePanel, { props: { url: "https://x.test/p/abc" } });
    await flushPromises();
    const mailto = w.find("a[href^='mailto:']");
    const sms = w.find("a[href^='sms:']");
    const tw = w.find("a[href*='twitter.com']");
    expect(mailto.attributes("href")).toContain("x.test%2Fp%2Fabc");
    expect(sms.exists()).toBe(true);
    expect(tw.attributes("href")).toContain("x.test");
    expect(w.find("img[data-test='qr']").exists()).toBe(true);
  });

  it("regenerates the QR code when the url prop changes", async () => {
    const QRCode = (await import("qrcode")).default;
    const w = mount(ShareProfilePanel, { props: { url: "https://x.test/p/abc" } });
    await flushPromises();
    vi.mocked(QRCode.toDataURL).mockClear();

    await w.setProps({ url: "https://x.test/p/def" });
    await flushPromises();

    expect(QRCode.toDataURL).toHaveBeenCalledWith("https://x.test/p/def");
  });

  it("copies the url to the clipboard when copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    const w = mount(ShareProfilePanel, { props: { url: "https://x.test/p/abc" } });
    await flushPromises();

    await w.find("[data-test='copy-link']").trigger("click");
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith("https://x.test/p/abc");
  });
});
