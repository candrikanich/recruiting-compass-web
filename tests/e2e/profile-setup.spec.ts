import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";

/**
 * Owner section-visibility toggle → public profile reflection.
 *
 * Playwright's default `page` fixture is already pre-authenticated as the
 * shared `player.json` account (see playwright.config.ts), so no manual
 * login is needed for the setup half of this flow. The public-page half
 * needs a genuinely anonymous context (no cookies/localStorage) — a demo
 * account slug from the live prod DB (e.g. `owen-andrikanich-2028`) isn't
 * reachable here: CI runs this suite against the dedicated test Supabase
 * project (see e2e.yml), which has no such profile seeded. Instead this
 * spec publishes the shared player account's own profile and reads its
 * slug straight off the setup page's share panel — self-contained, works
 * locally and in CI alike.
 *
 * Section under test: "values" ("Target Program & Values" in the editor,
 * rendered publicly as "Target Program & Values"). Unlike academics/awards/
 * team-history — which need seeded player-detail rows this shared account
 * may not have — the values section's content (`looking_for`) is set
 * directly on this same tab, so the whole flow is self-seeding.
 */
const RUN_ID = Date.now();
const LOOKING_FOR_TEXT = `E2E looking-for ${RUN_ID}`;
const PROFILE_PUT_PATTERN = (res: { url(): string; request(): { method(): string } }) =>
  res.url().includes("/api/player/profile") && res.request().method() === "PUT";

async function waitForProfileSave(page: Page, action: () => Promise<void>) {
  await Promise.all([page.waitForResponse(PROFILE_PUT_PATTERN), action()]);
}

/** Drive the section-visibility toggle to `target`, idempotent regardless of starting state. */
async function setSectionVisibility(
  page: Page,
  toggle: Locator,
  target: "Visible" | "Hidden",
) {
  // The visibility control is now an icon button exposing its state via
  // aria-pressed (true = section visible), not visible text.
  const wantPressed = target === "Visible";
  const isPressed = async () =>
    (await toggle.getAttribute("aria-pressed")) === "true";
  if ((await isPressed()) !== wantPressed) {
    await waitForProfileSave(page, () => toggle.click());
  }
  await expect(toggle).toHaveAttribute("aria-pressed", String(wantPressed));
}

test.describe("Public Profile section-visibility toggle", () => {
  test("owner hiding a section removes it from the public page; showing it restores it", async ({
    page,
    browser,
  }: {
    page: Page;
    browser: Browser;
  }) => {
    await page.goto("/settings/player-details");
    await page.waitForLoadState("domcontentloaded");

    await page
      .locator("button", { hasText: "Public Profile" })
      .first()
      .click();

    const publishToggle = page.locator('[data-test="publish-toggle"]');
    await publishToggle.waitFor({ state: "visible", timeout: 15000 });

    // Ensure published — an unpublished profile 410s on /p/:slug regardless
    // of section_config, which would make the absence assertion meaningless.
    if (!(await page.getByText("Profile is live").isVisible().catch(() => false))) {
      await waitForProfileSave(page, () => publishToggle.click());
    }
    await expect(page.getByText("Profile is live")).toBeVisible();

    // Seed the "values" section's own content on this tab (self-contained —
    // no dependency on other tabs' seeded player-detail rows).
    const lookingForTextarea = page.locator('[data-test="looking-for-textarea"]');
    await lookingForTextarea.fill(LOOKING_FOR_TEXT);
    await waitForProfileSave(page, () => lookingForTextarea.blur());

    // Read the published slug directly off the share panel — never hardcode
    // a slug, this account's profile may already exist from a prior run.
    const shareUrl = page.locator("[data-test='profile-share-url']", { hasText: "/p/" });
    await expect(shareUrl).toBeVisible();
    const urlText = (await shareUrl.textContent())?.trim() ?? "";
    const slug = urlText.split("/p/")[1];
    expect(slug, `could not parse a slug out of share URL "${urlText}"`).toBeTruthy();

    const valuesRow = page.locator("li", { hasText: "Target Program & Values" });
    const visibilityToggle = valuesRow.locator('[data-test="section-visibility"]');
    await expect(visibilityToggle).toBeVisible();

    // Start from a known state: visible, with content, and confirm the
    // public page actually shows it before we test hiding it.
    await setSectionVisibility(page, visibilityToggle, "Visible");

    const anonContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonPage = await anonContext.newPage();

      await anonPage.goto(`/p/${slug}`);
      await expect(
        anonPage.getByRole("heading", { name: "Target Program & Values" }),
      ).toBeVisible();
      await expect(anonPage.getByText(LOOKING_FOR_TEXT)).toBeVisible();

      // Hide the section on the setup page, then confirm it disappears
      // from a fresh anonymous visit.
      await setSectionVisibility(page, visibilityToggle, "Hidden");

      await anonPage.goto(`/p/${slug}`);
      await expect(
        anonPage.getByRole("heading", { name: "Target Program & Values" }),
      ).not.toBeVisible();
      await expect(anonPage.getByText(LOOKING_FOR_TEXT)).not.toBeVisible();

      // Show it again — confirm it comes back, and leave the shared account
      // in the same visible state this test started with.
      await setSectionVisibility(page, visibilityToggle, "Visible");

      await anonPage.goto(`/p/${slug}`);
      await expect(
        anonPage.getByRole("heading", { name: "Target Program & Values" }),
      ).toBeVisible();
      await expect(anonPage.getByText(LOOKING_FOR_TEXT)).toBeVisible();
    } finally {
      await anonContext.close();
    }
  });
});
