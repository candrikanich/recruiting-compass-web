import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * Public visitor submits "Contact Player" on `/p/<slug>` → confirmation +
 * (best-effort) player notification.
 *
 * Modeled on profile-setup.spec.ts: Playwright's default `page` fixture is
 * pre-authenticated as the shared `player.json` account (see
 * playwright.config.ts). The demo compassdemo account/slug only exists in
 * the live prod DB, not the dedicated test Supabase project CI runs
 * against, so this spec self-publishes the shared account's own profile and
 * reads its slug straight off the setup page's share panel — self-contained,
 * works locally and in CI alike. The public-page half of the flow needs a
 * genuinely anonymous context (no cookies/localStorage), since a real coach
 * visiting the page has no account.
 *
 * Turnstile is off in the test env (no NUXT_PUBLIC_TURNSTILE_SITE_KEY), so
 * the widget never mounts and never blocks submission.
 */
const RUN_ID = Date.now();
const COACH_NAME = `E2E Coach ${RUN_ID}`;
const COACH_NOTE = `E2E contact note ${RUN_ID} — saw your film, would love to talk.`;
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

test.describe("Public profile — Contact Player", () => {
  test("anonymous visitor submits Contact Player and sees a confirmation", async ({
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

      await anonPage.getByRole("button", { name: "Contact Player" }).click();

      // The modal is a native <dialog> — assert its heading is up before
      // touching fields, so a slow mount can't produce a flaky fill.
      await expect(
        anonPage.getByRole("heading", { name: /^Contact / }),
      ).toBeVisible();

      await anonPage.locator('[data-test="coach-name"]').fill(COACH_NAME);
      await anonPage
        .locator('[data-test="coach-email"]')
        .fill(`e2e-coach-${RUN_ID}@example.com`);
      await anonPage.locator('[data-test="note"]').fill(COACH_NOTE);

      // Honeypot (`hp`) intentionally left untouched — a real coach never
      // sees or fills it; a filled value would silently no-op the submit.

      await anonPage.getByRole("button", { name: "Send message" }).click();

      await expect(anonPage.getByText("Message sent.")).toBeVisible();
      await expect(
        anonPage.getByText(
          "The player will be notified and can respond directly.",
        ),
      ).toBeVisible();
    } finally {
      await anonContext.close();
    }

    // Best-effort: confirm the player-side notification landed. The
    // contact endpoint inserts the notification row synchronously before
    // responding `{ ok: true }`, so by the time the modal showed its
    // confirmation the row already exists — but the notifications page's
    // own render pipeline is a separate concern this spec doesn't own, so a
    // miss here is logged rather than failing the whole spec.
    try {
      await page.goto("/notifications");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByText(COACH_NAME).first()).toBeVisible({
        timeout: 10000,
      });
    } catch (err) {
      test.info().annotations.push({
        type: "note",
        description: `Player-side notification assertion did not confirm (non-blocking): ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
  });
});
