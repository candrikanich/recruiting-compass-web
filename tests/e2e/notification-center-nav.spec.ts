import { test, expect } from "@playwright/test";

/**
 * Regression: the header notification panel must be clickable / navigate.
 *
 * Same bug class as the "More" dropdown (see nav-more-dropdown.spec.ts): the
 * panel's dismiss backdrop was `Teleport`ed to <body>, and because #__nuxt has
 * `isolation: isolate`, the body-level backdrop (z-40) painted above the panel
 * (trapped inside #__nuxt behind the sticky z-50 header). Clicks on the panel's
 * items/links hit the backdrop instead — the panel closed but nothing fired.
 *
 * Fix: keep the backdrop in the same stacking context as the panel (no
 * Teleport). This asserts the panel's "View All" link is the topmost element
 * and that clicking it navigates.
 */
test.describe.configure({ mode: "serial" });

test.describe("Header notification panel (desktop)", () => {
  test("panel content is clickable and 'View All' routes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    const bell = page.getByRole("button", { name: /Notifications/ });
    await bell.waitFor({ state: "visible" });
    await bell.click();

    const viewAll = page.getByRole("link", { name: /View All Notifications/i });
    await viewAll.waitFor({ state: "visible" });

    // The regression: the teleported backdrop sat on top of the panel, so the
    // element at the link's center was the backdrop, not the anchor.
    const linkIsOnTop = await viewAll.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      );
      return el === top || el.contains(top);
    });
    expect(
      linkIsOnTop,
      "Notification panel link must be the topmost element (not the backdrop)",
    ).toBe(true);

    await viewAll.click();
    await page.waitForURL(/\/notifications(\/|$)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/notifications(\/|$)/);
  });
});
