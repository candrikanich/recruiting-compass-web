import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * Public visitor submits "Express Interest" on `/p/<slug>` → the hero button
 * flips to "Interest Sent" → the lead is visible in the player's own Inbox
 * tab.
 *
 * Mirrors profile-contact.spec.ts: Playwright's default `page` fixture is
 * pre-authenticated as the shared `player.json` account (see
 * playwright.config.ts). This spec self-publishes that account's own
 * profile and reads its slug off the setup page's share panel — the demo
 * compassdemo account/slug only exists in the live prod DB, not the
 * dedicated test Supabase project CI runs against. The public-page half of
 * the flow needs a genuinely anonymous context (no cookies/localStorage),
 * since a real coach visiting the page has no account.
 *
 * Turnstile is off in the test env (no NUXT_PUBLIC_TURNSTILE_SITE_KEY), so
 * the widget never mounts and never blocks submission.
 */
const RUN_ID = Date.now();
const COACH_NAME = `E2E Interest Coach ${RUN_ID}`;
const COACH_NOTE = `E2E interest note ${RUN_ID} — would love to talk about your future.`;
const PROFILE_PUT_PATTERN = (res: { url(): string; request(): { method(): string } }) =>
  res.url().includes("/api/player/profile") && res.request().method() === "PUT";

async function waitForProfileSave(page: Page, action: () => Promise<void>) {
  await Promise.all([page.waitForResponse(PROFILE_PUT_PATTERN), action()]);
}

async function ensurePublishedAndGetSlug(page: Page): Promise<string> {
  await page.goto("/settings/player-details");
  await page.waitForLoadState("domcontentloaded");

  await page
    .locator("button", { hasText: "Public Profile" })
    .first()
    .click();

  const publishToggle = page.locator('[data-test="publish-toggle"]');
  await publishToggle.waitFor({ state: "visible", timeout: 15000 });

  // Ensure published — an unpublished profile 410s on /p/:slug, which would
  // make the anonymous-visitor flow below unreachable.
  if (!(await page.getByText("Profile is live").isVisible().catch(() => false))) {
    await waitForProfileSave(page, () => publishToggle.click());
  }
  await expect(page.getByText("Profile is live")).toBeVisible();

  // Read the published slug directly off the share panel — never hardcode a
  // slug, this account's profile may already exist from a prior run.
  const shareUrl = page.locator("span.font-mono", { hasText: "/p/" });
  await expect(shareUrl).toBeVisible();
  const urlText = (await shareUrl.textContent())?.trim() ?? "";
  const slug = urlText.split("/p/")[1];
  expect(slug, `could not parse a slug out of share URL "${urlText}"`).toBeTruthy();
  return slug;
}

test.describe("Public profile — Express Interest", () => {
  test("anonymous visitor expresses interest, hero flips to Interest Sent, and the lead lands in the player's inbox", async ({
    page,
    browser,
  }: {
    page: Page;
    browser: Browser;
  }) => {
    const slug = await ensurePublishedAndGetSlug(page);

    const anonContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonPage = await anonContext.newPage();
      await anonPage.goto(`/p/${slug}`);

      const interestButton = anonPage.getByRole("button", {
        name: "Express Interest",
      });
      await interestButton.click();

      // The popover is a native <dialog> — assert its heading is up before
      // touching fields, so a slow mount can't produce a flaky fill.
      await expect(
        anonPage.getByRole("heading", { name: /^Express interest in/ }),
      ).toBeVisible();

      // Program renders as a <select> when the profile has athletic
      // sport/position data, or a free-text input otherwise — handle both
      // rather than assuming the shared test account's data shape.
      const programSelect = anonPage.locator('[data-test="program-select"]');
      const programInput = anonPage.locator('[data-test="program-input"]');
      if (await programSelect.isVisible().catch(() => false)) {
        await programSelect.selectOption({ index: 1 });
      } else {
        await programInput.fill(`E2E Program ${RUN_ID}`);
      }

      await anonPage.locator('[data-test="coach-name"]').fill(COACH_NAME);
      await anonPage
        .locator('[data-test="coach-email"]')
        .fill(`e2e-interest-coach-${RUN_ID}@example.com`);
      await anonPage.locator('[data-test="note"]').fill(COACH_NOTE);

      // Honeypot (`hp`) intentionally left untouched — a real coach never
      // sees or fills it; a filled value would silently no-op the submit.

      await anonPage.getByRole("button", { name: "Express interest" }).click();

      await expect(anonPage.getByText("Interest sent.")).toBeVisible();
      await expect(
        anonPage.getByText("The player has been notified of your interest."),
      ).toBeVisible();

      // Close the confirmation — the popover only closes on this explicit
      // action (not on submit), same fix as the sibling Contact modal.
      await anonPage.getByRole("button", { name: "Close" }).click();

      // Hero button is disabled and now reads "Interest Sent" — persisted
      // client-side (per-slug localStorage) so a repeat visitor can't spam.
      await expect(
        anonPage.getByRole("button", { name: "Interest Sent" }),
      ).toBeDisabled();
    } finally {
      await anonContext.close();
    }

    // Player-side: the lead is visible in the Public Profile → Inbox tab.
    await page.goto("/settings/player-details");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("button", { hasText: "Inbox" }).first().click();

    const leadRow = page.getByText(COACH_NAME).first();
    await expect(leadRow).toBeVisible({ timeout: 10000 });

    const interestBadge = page
      .locator("li", { hasText: COACH_NAME })
      .getByText("Interest", { exact: true });
    await expect(interestBadge).toBeVisible();

    // Month-count tile reflects at least this run's lead.
    const interestStat = page.locator('[data-testid="stat-interest-this-month"]');
    await expect(interestStat).toBeVisible();
  });
});
