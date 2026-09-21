import { describe, it, expect, afterEach } from "vitest";
import { wrapEmailLayout } from "~/server/utils/emailTemplates";

describe("wrapEmailLayout", () => {
  afterEach(() => {
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.EMAIL_LEGAL_ADDRESS;
  });

  it("wraps body HTML in the branded shell", () => {
    const html = wrapEmailLayout("<p>Hello there</p>");
    expect(html).toContain("<p>Hello there</p>");
    expect(html).toContain('alt="The Recruiting Compass"');
  });

  it("uses PUBLIC_BASE_URL for the logo when set", () => {
    process.env.PUBLIC_BASE_URL = "https://staging.example.com";
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain(
      "https://staging.example.com/assets/logos/recruiting-compass-horizontal.png",
    );
  });

  it("falls back to the production domain for the logo when unset", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain(
      "https://myrecruitingcompass.com/assets/logos/recruiting-compass-horizontal.png",
    );
  });

  it("includes a hidden preheader when provided", () => {
    const html = wrapEmailLayout("<p>x</p>", {
      preheader: "Your weekly recap is here",
    });
    expect(html).toContain("Your weekly recap is here");
    expect(html).toContain("display:none");
  });

  it("omits the hidden-preheader markup when no preheader is given", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).not.toContain("display:none");
  });

  it("renders a table-based layout for cross-client compatibility", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("<table");
    expect(html).toContain('role="presentation"');
  });

  it("omits the unsubscribe line when no unsubscribeUrl is given", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html.toLowerCase()).not.toContain("unsubscribe");
  });

  it("includes an unsubscribe link when unsubscribeUrl is given", () => {
    const html = wrapEmailLayout("<p>x</p>", {
      unsubscribeUrl: "https://app.example.com/unsub?token=abc",
    });
    expect(html).toContain('href="https://app.example.com/unsub?token=abc"');
    expect(html.toLowerCase()).toContain("unsubscribe");
  });

  it("includes all three social links", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("https://www.instagram.com/therecruitingcompass");
    expect(html).toContain("https://x.com/recruitCompass");
    expect(html).toContain("https://www.facebook.com/TheRecruitingCompass/");
  });

  it("falls back to a safe legal-address placeholder when EMAIL_LEGAL_ADDRESS is unset", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("The Recruiting Compass");
  });

  it("uses EMAIL_LEGAL_ADDRESS when set", () => {
    process.env.EMAIL_LEGAL_ADDRESS = "123 Test St, Test City, OH 44000";
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("123 Test St, Test City, OH 44000");
  });

  it("includes a dark-mode media query", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("prefers-color-scheme: dark");
  });

  it("keeps CTA-button anchors readable in dark mode by excluding them from the plain-link color override", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain(".trc-email-text a:not(.trc-email-btn)");
    expect(html).toContain(
      ".trc-email-text a.trc-email-btn { color:#ffffff !important; }",
    );
  });
});
