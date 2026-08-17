import { test, expect } from "@playwright/test";

/**
 * Regression: the desktop header "More" dropdown must navigate on click.
 *
 * Bug (all environments): the dropdown's dismiss backdrop was `Teleport`ed to
 * <body>. The app root (#__nuxt) carries `isolation: isolate`, which creates a
 * stacking context — so the body-level backdrop (z-40) painted ABOVE the whole
 * app, including the menu itself (trapped inside #__nuxt behind the sticky
 * z-50 header). Every link click landed on the backdrop: the dropdown closed
 * (@click) but navigation never fired ("closes, no route"). The mobile menu,
 * having no such backdrop, was unaffected — matching the reported symptom.
 *
 * Fix: keep the backdrop in the same stacking context as the menu (no Teleport),
 * so menu z-50 > backdrop z-40 as intended and clicks reach the links.
 *
 * These assertions fail against the pre-fix component and pass after it.
 */
test.describe.configure({ mode: "serial" });

test.describe("Header 'More' dropdown navigation (desktop)", () => {
  const items: Array<{ testid: string; path: RegExp }> = [
    { testid: "nav-more-events", path: /\/events(\/|$)/ },
    { testid: "nav-more-performance", path: /\/performance(\/|$)/ },
    { testid: "nav-more-documents", path: /\/documents(\/|$)/ },
  ];

  for (const { testid, path } of items) {
    test(`clicking ${testid} routes to its page`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/dashboard");

      const moreButton = page.getByTestId("nav-more-button");
      await moreButton.waitFor({ state: "visible" });
      await moreButton.click();

      const link = page.getByTestId(testid);
      await link.waitFor({ state: "visible" });

      // The regression: the teleported backdrop sat on top of the link, so the
      // element at the link's center was the backdrop, not the anchor. Assert
      // the link is the topmost element before clicking.
      const linkIsOnTop = await link.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2,
        );
        return el === top || el.contains(top);
      });
      expect(
        linkIsOnTop,
        "More link must be the topmost element (not the backdrop)",
      ).toBe(true);

      await link.click();
      await page.waitForURL(path, { timeout: 10000 });
      expect(page.url()).toMatch(path);
    });
  }
});
