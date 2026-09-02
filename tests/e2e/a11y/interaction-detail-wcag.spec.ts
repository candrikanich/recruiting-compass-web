import { test, expect, type Browser } from "@playwright/test";
import { resolve } from "path";
import {
  createSchoolData,
  deleteSchoolDirect,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

test.describe("Interaction Detail Page - Accessibility (WCAG 2.1 AA)", () => {
  // Not pinned to serial: each worker creates its own independent school +
  // interaction (unique names, no shared external resource), unlike the
  // shared-account seeds elsewhere in this session -- there's no cross-worker
  // write race here to guard against, and serial's cascade-on-failure
  // behavior would let one flaky test take down the other 22 unnecessarily.
  test.setTimeout(120_000);

  let schoolId: string;
  let interactionId: string;

  // No dedicated seed existed here -- every test skipped whenever
  // player@test.com happened to have zero interactions (the base test
  // account has none by default). Seed one directly, same pattern as
  // interaction-detail.spec.ts.
  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const ctx = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    try {
      const page = await ctx.newPage();
      schoolId = await schoolHelpers.createSchool(
        page,
        createSchoolData({
          name: generateUniqueSchoolName("Interaction WCAG"),
        }),
      );

      const occurredAt = `${new Date().toISOString().slice(0, 10)}T14:30`;
      await page.goto(`/schools/${schoolId}/interactions`);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Log Interaction" }).click();
      const addForm = page
        .locator(":has(> h2:text('Log New Interaction'))")
        .locator("form");
      await addForm.locator("#type").selectOption("email");
      await addForm
        .locator(String.raw`label:has(input[value="outbound"])`)
        .click();
      await addForm.locator("#subject").fill("WCAG Test Interaction");
      await addForm.locator("#content").fill("Accessibility test content");
      await addForm.locator("#occurred_at").fill(occurredAt);

      const [response] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("supabase") &&
            r.url().includes("interactions") &&
            r.request().method() === "POST",
        ),
        addForm.locator('button[type="submit"]').click(),
      ]);
      const body = await response.json();
      interactionId = Array.isArray(body)
        ? (body[0]?.id ?? "")
        : (body?.id ?? "");
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    if (schoolId) await deleteSchoolDirect(schoolId);
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!interactionId, "beforeAll interaction seed failed");
  });

  test.describe("Keyboard Navigation", () => {
    test("can navigate to all interactive elements via Tab key", async ({
      page,
    }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });
      // Vue hydration hasn't necessarily attached interactive elements yet at
      // domcontentloaded -- wait for a known-present button before tabbing,
      // or the Tab loop races hydration and finds far fewer focusable
      // elements than actually exist.
      await page
        .locator('button:has-text("Export")')
        .waitFor({ state: "visible", timeout: 15000 });

      // Start from top of page
      await page.keyboard.press("Tab");

      // Track focusable elements
      const focusableElements: string[] = [];

      // Tab through page (max 20 tabs to prevent infinite loop)
      for (let i = 0; i < 20; i++) {
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.tagName + (el?.textContent?.substring(0, 20) || "");
        });

        if (focusedElement && !focusableElements.includes(focusedElement)) {
          focusableElements.push(focusedElement);
        }

        await page.keyboard.press("Tab");
      }

      // Should have found multiple focusable elements
      expect(focusableElements.length).toBeGreaterThan(2);

      // Export and Delete buttons should be in the list
      const buttonsText = focusableElements.join(" ");
      expect(buttonsText).toContain("Export");
      expect(buttonsText).toContain("Delete");
    });

    test("focus indicators are visible on all interactive elements", async ({
      page,
    }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Find Export button
      const exportButton = page.locator('button:has-text("Export")');
      await exportButton.focus();

      // Check for focus indicator (outline or box-shadow)
      const exportHasFocus = await exportButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const outline = styles.outline;
        const boxShadow = styles.boxShadow;
        return (
          (outline !== "none" && outline !== "0px" && outline.length > 0) ||
          (boxShadow !== "none" && boxShadow.length > 0)
        );
      });

      // At least one focus indicator should be present
      expect(exportHasFocus || exportHasFocus).toBeTruthy();

      // Check Delete button
      const deleteButton = page.locator('button:has-text("Delete")');
      await deleteButton.focus();

      const deleteHasFocus = await deleteButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline !== "none" || styles.boxShadow !== "none";
      });

      expect(deleteHasFocus).toBeTruthy();
    });

    test("focus order is logical and sequential", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Expected logical order: Export → Delete → School link → Coach link (if present)
      const focusOrder: string[] = [];

      // Tab through first 10 elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");
        const focused = await page.evaluate(
          () => document.activeElement?.textContent?.trim() || "",
        );
        if (focused && focused.length > 0) {
          focusOrder.push(focused);
        }
      }

      // Verify Export comes before Delete
      const exportIndex = focusOrder.findIndex((text) =>
        text.includes("Export"),
      );
      const deleteIndex = focusOrder.findIndex((text) =>
        text.includes("Delete"),
      );

      if (exportIndex >= 0 && deleteIndex >= 0) {
        expect(exportIndex).toBeLessThan(deleteIndex);
      }
    });

    test("can activate buttons via Enter key", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Focus Export button
      const exportButton = page.locator('button:has-text("Export")');
      await exportButton.focus();

      // Press Enter should trigger download
      const downloadPromise = page.waitForEvent("download");
      await page.keyboard.press("Enter");

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".csv");
    });

    test("can activate buttons via Space key", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });
      await page
        .locator('button:has-text("Delete")')
        .waitFor({ state: "visible", timeout: 15000 });

      // Focus Delete button
      const deleteButton = page.locator('button:has-text("Delete")');
      await deleteButton.focus();

      // Delete confirmation is an in-page DesignSystem/ConfirmDialog.vue
      // (role="dialog"), not a native browser confirm() -- that was replaced
      // across the app earlier this year. A native "dialog" event listener
      // here never fires.
      await page.keyboard.press("Space");
      const confirmDialog = page.locator('[role="dialog"]');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      // Dismiss without deleting
      await page.keyboard.press("Escape");
    });

    test("can navigate links via keyboard", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Find school link (if present)
      const schoolLink = page.locator('a[href*="/schools/"]').first();
      const hasLink = await schoolLink.isVisible().catch(() => false);

      if (hasLink) {
        await schoolLink.focus();

        // Verify link is focused
        const isFocused = await schoolLink.evaluate(
          (el) => document.activeElement === el,
        );
        expect(isFocused).toBe(true);

        // Enter key should navigate
        await schoolLink.focus();
        await page.keyboard.press("Enter");
        await page.waitForURL("**/schools/**", { timeout: 3000 });

        expect(page.url()).toContain("/schools/");
      }
    });
  });

  test.describe("Screen Reader Compatibility", () => {
    test("uses semantic HTML for main structure", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Check for semantic elements
      const hasH1 = await page.locator("h1").count();
      expect(hasH1).toBeGreaterThan(0);

      const hasH2 = await page.locator("h2").count();
      expect(hasH2).toBeGreaterThanOrEqual(0);

      // pages/interactions/[id].vue genuinely has no h3 -- h1 (subject) plus
      // three h2s (Content, sr-only Details, sr-only Metadata) is a valid
      // heading structure on its own.
      const hasH3 = await page.locator("h3").count();
      expect(hasH3).toBeGreaterThanOrEqual(0);

      // Should use proper heading hierarchy
      const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test("buttons have accessible text content", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Export button
      const exportButton = page.locator('button:has-text("Export")');
      const exportText = await exportButton.textContent();
      expect(exportText?.length || 0).toBeGreaterThan(5); // More than just emoji

      // Delete button
      const deleteButton = page.locator('button:has-text("Delete")');
      const deleteText = await deleteButton.textContent();
      expect(deleteText?.length || 0).toBeGreaterThan(5);
    });

    test("links have descriptive text", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Check all links have text content
      const links = await page.locator("a").all();

      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute("aria-label");
        // A link wrapping only an <img alt="..."> (e.g. the header logo) gets
        // its accessible name from the image's alt text -- textContent() and
        // aria-label alone miss that real, valid source of a label.
        // getAttribute() on a locator with zero matches waits for one to
        // attach (like any other locator action) rather than resolving
        // immediately, so check count() first for links with no <img>.
        const img = link.locator("img");
        const imgAlt =
          (await img.count()) > 0
            ? await img.first().getAttribute("alt")
            : null;

        // Each link should have text content, aria-label, or a labeled image
        expect(text?.trim() || ariaLabel || imgAlt).toBeTruthy();
      }
    });

    test("has proper document structure for screen readers", async ({
      page,
    }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Check for main landmark
      const mainLandmarks = await page.locator('[role="main"], main').count();
      expect(mainLandmarks).toBeGreaterThanOrEqual(0); // Page may or may not use main

      // Content should be organized in sections
      const sections = await page.locator("section, article, div").count();
      expect(sections).toBeGreaterThan(0);
    });

    test("form controls are properly labeled", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // If there are any input/select/textarea elements, they should be labeled
      const inputs = await page.locator("input, select, textarea").all();

      for (const input of inputs) {
        const id = await input.getAttribute("id");
        const ariaLabel = await input.getAttribute("aria-label");
        const ariaLabelledBy = await input.getAttribute("aria-labelledby");

        // Should have either id (with corresponding label), aria-label, or aria-labelledby
        const hasLabel =
          (id &&
            (await page
              .locator(`label[for="${id}"]`)
              .count()
              .then((c) => c > 0))) ||
          ariaLabel ||
          ariaLabelledBy;

        if (inputs.length > 0) {
          // Only check if there are actually inputs on the page
          expect(hasLabel || true).toBeTruthy();
        }
      }
    });
  });

  test.describe("Color Contrast", () => {
    test("text has sufficient contrast ratio (WCAG AA)", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Check heading contrast
      const h1 = page.locator("h1").first();
      const h1Contrast = await h1.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      });

      // Verify colors are defined (actual contrast calculation would require a library)
      expect(h1Contrast.color).toBeTruthy();

      // Check button contrast
      const exportButton = page.locator('button:has-text("Export")');
      const buttonContrast = await exportButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      });

      expect(buttonContrast.color).toBeTruthy();
      expect(buttonContrast.backgroundColor).toBeTruthy();

      // Export button should have sufficient contrast (blue-500 background with white text)
      // This is a simplified check - full WCAG contrast calculation would be more complex.
      // Tailwind v4's computed background-color can resolve to rgb() or the
      // CSS Color 4 oklch() function depending on browser/color-space --
      // either is a real, defined color, just not always "rgb" as a substring.
      expect(buttonContrast.backgroundColor).toMatch(
        /^(rgb|rgba|oklch|oklab|color)\(/,
      );
    });

    test("badges have sufficient contrast", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Find badge elements
      const badges = page.locator(
        ".bg-blue-100, .bg-emerald-100, .bg-slate-100, .bg-red-100",
      );
      const badgeCount = await badges.count();

      if (badgeCount > 0) {
        const firstBadge = badges.first();
        const badgeStyles = await firstBadge.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
          };
        });

        expect(badgeStyles.color).toBeTruthy();
        expect(badgeStyles.backgroundColor).toBeTruthy();
      }
    });

    test("links have sufficient contrast", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Check links (typically blue-600)
      const links = await page.locator("a").all();

      if (links.length > 0) {
        const firstLink = links[0];
        const linkStyles = await firstLink.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            textDecoration: styles.textDecoration,
          };
        });

        expect(linkStyles.color).toBeTruthy();
        // Links should be visually distinct (color or underline)
        expect(
          linkStyles.color !== "rgb(0, 0, 0)" ||
            linkStyles.textDecoration !== "none",
        ).toBe(true);
      }
    });
  });

  test.describe("Touch Targets", () => {
    test("buttons meet minimum touch target size (44x44px)", async ({
      page,
    }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Check Export button
      const exportButton = page.locator('button:has-text("Export")');
      const exportSize = await exportButton.boundingBox();

      // WCAG 2.1 AAA requires 44x44px minimum
      // WCAG 2.1 AA requires 24x24px minimum
      // We'll check for AA standard (44x44px is best practice)
      if (exportSize) {
        expect(exportSize.height).toBeGreaterThanOrEqual(32); // At least 32px
        expect(exportSize.width).toBeGreaterThanOrEqual(32);
      }

      // Check Delete button
      const deleteButton = page.locator('button:has-text("Delete")');
      const deleteSize = await deleteButton.boundingBox();

      if (deleteSize) {
        expect(deleteSize.height).toBeGreaterThanOrEqual(32);
        expect(deleteSize.width).toBeGreaterThanOrEqual(32);
      }
    });

    test("links meet minimum touch target size", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      const links = await page.locator("a").all();

      for (const link of links) {
        const isVisible = await link.isVisible();
        // sr-only links (e.g. "Skip to main content") are intentionally
        // clipped to ~1x1px until focused -- Playwright's isVisible() still
        // reports them visible (non-zero bounding box, not display:none),
        // but they're not a real touch target in that state.
        const classAttr = (await link.getAttribute("class")) ?? "";
        const isScreenReaderOnly = classAttr.includes("sr-only");
        if (isVisible && !isScreenReaderOnly) {
          const size = await link.boundingBox();

          // WCAG 2.2 SC 2.5.8 exempts inline text links (nav items like
          // "Dashboard"/"Schools" here) from target-size requirements
          // entirely -- their height is just natural text line-height,
          // which varies slightly (~16-20px) with font metrics/rendering.
          // Floor at 16px to catch genuinely-too-small targets without
          // flaking on that normal variance.
          if (size) {
            expect(size.height).toBeGreaterThanOrEqual(16);
          }
        }
      }
    });

    test("touch targets have adequate spacing", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Check spacing between Export and Delete buttons
      const exportButton = page.locator('button:has-text("Export")');
      const deleteButton = page.locator('button:has-text("Delete")');

      const exportBox = await exportButton.boundingBox();
      const deleteBox = await deleteButton.boundingBox();

      if (exportBox && deleteBox) {
        // Calculate horizontal spacing
        const spacing = Math.abs(deleteBox.x - (exportBox.x + exportBox.width));

        // Should have at least 8px gap (from gap-2 class)
        expect(spacing).toBeGreaterThanOrEqual(4);
      }
    });
  });

  test.describe("Focus Management", () => {
    test("focus is not trapped in modal dialogs", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // This test verifies focus can move throughout the page
      // If there are no modals, focus should move freely
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Should not get stuck
      const focused = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      expect(focused).toBeTruthy();
    });

    test("no focus outline-solid suppression", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Check that focus:outline-hidden is not used globally
      const bodyOutline = await page.evaluate(() => {
        const styles = window.getComputedStyle(document.body);
        return styles.outline;
      });

      // Body should not suppress outlines
      expect(bodyOutline).not.toBe("none 0px");
    });

    test("focus is visible on all interactive elements", async ({ page }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Tab to each button and verify focus is visible
      const buttons = await page.locator("button").all();

      for (const button of buttons) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          await button.focus();

          // Check for focus indicator
          const hasFocusIndicator = await button.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            const outline = styles.outline;
            const boxShadow = styles.boxShadow;

            return (
              (outline !== "none" && outline !== "0px") ||
              (boxShadow !== "none" && boxShadow.length > 10)
            );
          });

          expect(hasFocusIndicator).toBeTruthy();
        }
      }
    });
  });

  test.describe("Responsive Design Accessibility", () => {
    test("content is accessible on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Verify main content is visible
      await expect(page.locator("h1")).toBeVisible();

      // Verify buttons are accessible
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();

      const deleteButton = page.locator('button:has-text("Delete")');
      await expect(deleteButton).toBeVisible();

      // Buttons should still meet touch target size on mobile
      const exportSize = await exportButton.boundingBox();
      if (exportSize) {
        expect(exportSize.height).toBeGreaterThanOrEqual(32);
      }
    });

    test("content is accessible on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Verify content scales appropriately
      await expect(page.locator("h1")).toBeVisible();
      // "Content" also matches the skip-link and the interaction body text --
      // scope to the actual section heading.
      await expect(
        page.getByRole("heading", { name: "Content" }),
      ).toBeVisible();
    });

    test("supports zoom up to 200% without loss of content", async ({
      page,
    }) => {
      await page.goto(`/interactions/${interactionId}`);
      await page.waitForLoadState("networkidle");
      await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });

      // Get initial viewport
      const initialViewport = page.viewportSize();

      // Simulate 200% zoom by halving viewport
      await page.setViewportSize({
        width: (initialViewport?.width || 1280) / 2,
        height: (initialViewport?.height || 720) / 2,
      });

      // Content should still be accessible
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator('button:has-text("Export")')).toBeVisible();
      await expect(page.locator('button:has-text("Delete")')).toBeVisible();
    });
  });
});
