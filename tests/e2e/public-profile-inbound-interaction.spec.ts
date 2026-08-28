import { test, expect, type Browser, type Page } from "@playwright/test";
import { resolve } from "path";
import {
  schoolHelpers,
  createSchoolData,
  generateUniqueSchoolName,
  deleteSchoolDirect,
} from "./fixtures/schools.fixture";

/**
 * Public visitor submits "Contact Player" on `/p/<slug>` and the lead becomes
 * a tracked interaction — either automatically (coach email already known to
 * the family) or via the player's Assign-coach flow (novel email).
 *
 * Modeled on profile-contact.spec.ts / profile-interest.spec.ts: Playwright's
 * default `page` fixture is pre-authenticated as the shared `player.json`
 * account. This spec self-publishes that account's own profile and reads its
 * slug off the setup page's share panel. The public-page half of each flow
 * needs a genuinely anonymous context (no cookies/localStorage), since a
 * real coach visiting the page has no account.
 *
 * Turnstile is off in the test env (no NUXT_PUBLIC_TURNSTILE_SITE_KEY), so
 * the widget never mounts and never blocks submission.
 */
const RUN_ID = Date.now();
const PROFILE_PUT_PATTERN = (res: {
  url(): string;
  request(): { method(): string };
}) => res.url().includes("/api/player/profile") && res.request().method() === "PUT";

async function waitForProfileSave(page: Page, action: () => Promise<void>) {
  await Promise.all([page.waitForResponse(PROFILE_PUT_PATTERN), action()]);
}

async function ensurePublishedAndGetSlug(page: Page): Promise<string> {
  await page.goto("/settings/player-details");
  await page.waitForLoadState("networkidle");

  await page
    .locator("button", { hasText: "Public Profile" })
    .first()
    .click();

  const publishToggle = page.locator('[data-test="publish-toggle"]');
  await publishToggle.waitFor({ state: "visible", timeout: 15000 });

  // Ensure published — an unpublished profile 410s on /p/:slug, which would
  // make the anonymous-visitor flow below unreachable.
  if (
    !(await page
      .getByText("Profile is live")
      .isVisible()
      .catch(() => false))
  ) {
    await waitForProfileSave(page, () => publishToggle.click());
  }
  await expect(page.getByText("Profile is live")).toBeVisible({ timeout: 15000 });

  // Read the published slug directly off the share panel — never hardcode a
  // slug, this account's profile may already exist from a prior run.
  // ShareProfilePanel.vue renders the URL in a plain `<span :title="url">`
  // with no distinguishing class — target the `title` attribute rather than
  // a CSS class, which drifted from what sibling specs (profile-contact,
  // profile-interest) currently assume.
  const shareUrl = page.locator('span[title*="/p/"]');
  await expect(shareUrl).toBeVisible();
  const urlText = (await shareUrl.textContent())?.trim() ?? "";
  const slug = urlText.split("/p/")[1];
  expect(slug, `could not parse a slug out of share URL "${urlText}"`).toBeTruthy();
  return slug;
}

async function submitContact(
  browser: Browser,
  slug: string,
  fields: { coachName: string; coachEmail: string; note: string },
): Promise<void> {
  const anonContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  try {
    const anonPage = await anonContext.newPage();
    await anonPage.goto(`/p/${slug}`);

    await anonPage.getByRole("button", { name: "Contact Player" }).click();
    await expect(
      anonPage.getByRole("heading", { name: /^Contact / }),
    ).toBeVisible();

    await anonPage.locator('[data-test="coach-name"]').fill(fields.coachName);
    await anonPage
      .locator('[data-test="coach-email"]')
      .fill(fields.coachEmail);
    await anonPage.locator('[data-test="note"]').fill(fields.note);

    // Honeypot (`hp`) intentionally left untouched — a real coach never
    // sees or fills it; a filled value would silently no-op the submit.

    await anonPage.getByRole("button", { name: "Send message" }).click();
    await expect(anonPage.getByText("Message sent.")).toBeVisible({ timeout: 15000 });
  } finally {
    await anonContext.close();
  }
}

async function openInbox(page: Page): Promise<void> {
  await page.goto("/settings/player-details");
  await page.waitForLoadState("networkidle");
  await page.locator("button", { hasText: "Public Profile" }).first().click();
  await page.locator("button", { hasText: "Inbox" }).first().click();
  // Inbox defaults to the "Open" filter, which excludes nothing relevant
  // here, but flip to "All" so a lead that flips straight to resolved is
  // never hidden by a stale filter state from a prior run.
  await page.locator('[data-test="filter-all"]').click();
}

test.describe("Public profile — inbound lead becomes a tracked interaction", () => {
  // Both tests drive the same shared player.json account (publish toggle,
  // Inbox tab, coach assignment) — fullyParallel would run them in separate
  // workers concurrently and race on that shared state.
  test.describe.configure({ mode: "serial" });

  let schoolId: string;
  let matchedCoachEmail: string;
  let matchedCoachName: string;

  test.beforeAll(async ({ browser }) => {
    // `browser.newPage()` opens a bare context — it does NOT inherit the
    // project's `use.storageState`, unlike the `page` fixture. Load the
    // same player auth state explicitly or this setup page is anonymous.
    const setupContext = await browser.newContext({
      storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
    });
    const setupPage = await setupContext.newPage();
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName(`Inbound Lead ${RUN_ID}`),
    });
    schoolId = await schoolHelpers.createSchool(setupPage, schoolData);

    matchedCoachName = `E2E Matched Coach ${RUN_ID}`;
    matchedCoachEmail = `e2e-matched-${RUN_ID}@example.com`;
    // The coach row's own name is independent of the lead's coach_name (that
    // comes straight from the Contact form's free-text field, not a DB
    // join) — matching happens by email only.
    await schoolHelpers.addCoachToSchool(setupPage, schoolId, {
      firstName: "Matched",
      lastName: `Coach${RUN_ID}`,
      role: "head",
      email: matchedCoachEmail,
    });

    // addCoachToSchool only waits for `domcontentloaded`, not for the
    // client-driven coach insert itself — without this, the public Contact
    // submission a moment later can race the still-in-flight write and find
    // no matching coach yet.
    await expect(setupPage.getByText(`Coach${RUN_ID}`).first()).toBeVisible({
      timeout: 10000,
    });

    await setupContext.close();
  });

  test.afterAll(async () => {
    await deleteSchoolDirect(schoolId);
  });

  test("matched email auto-creates an interaction and the lead shows Tracked", async ({
    page,
    browser,
  }) => {
    const slug = await ensurePublishedAndGetSlug(page);
    const note = `E2E matched inbound note ${RUN_ID}`;

    await submitContact(browser, slug, {
      coachName: matchedCoachName,
      coachEmail: matchedCoachEmail,
      note,
    });

    // Interaction appears on the interactions page — auto-minted server-side
    // because the coach email matched an existing coach in the family.
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(note)).toBeVisible({ timeout: 15000 });

    // The inbox lead for this coach shows "Tracked".
    await openInbox(page);
    const leadRow = page.locator("li", { hasText: matchedCoachName });
    await expect(leadRow.first()).toBeVisible({ timeout: 10000 });
    await expect(
      leadRow.first().getByText("Tracked", { exact: true }),
    ).toBeVisible();
  });

  test("unmatched email needs a coach, then Assign-coach produces a tracked interaction", async ({
    page,
    browser,
  }) => {
    const slug = await ensurePublishedAndGetSlug(page);
    const novelCoachName = `E2E Unmatched Coach ${RUN_ID}`;
    const novelCoachEmail = `e2e-unmatched-${RUN_ID}@example.com`;
    const note = `E2E unmatched inbound note ${RUN_ID}`;

    await submitContact(browser, slug, {
      coachName: novelCoachName,
      coachEmail: novelCoachEmail,
      note,
    });

    await openInbox(page);
    const leadRow = page.locator("li", { hasText: novelCoachName });
    await expect(leadRow.first()).toBeVisible({ timeout: 10000 });
    await expect(
      leadRow.first().getByText("Needs coach", { exact: true }),
    ).toBeVisible();

    await leadRow.first().getByRole("button", { name: "Assign coach" }).click();

    await expect(
      page.getByRole("heading", { name: "Assign to a coach" }),
    ).toBeVisible();

    const schoolSelect = page.locator('[data-test="school-select"]');
    await schoolSelect.locator(`option[value="${schoolId}"]`).waitFor({
      state: "attached",
      timeout: 10000,
    });
    await schoolSelect.selectOption(schoolId);

    await page.locator('[data-test="create-new-coach"]').click();
    // First/last name are prefilled from the lead's coach_name; email is
    // prefilled from the lead's coach_email — assert the prefill rather than
    // re-typing it, then just confirm.
    await expect(page.locator('[data-test="new-coach-email"]')).toHaveValue(
      novelCoachEmail,
    );

    await page.locator('[data-test="confirm-assign"]').click();

    // Modal closes and the inbox refetches — lead flips to Tracked.
    await expect(
      page.getByRole("heading", { name: "Assign to a coach" }),
    ).toHaveCount(0);
    await expect(
      leadRow.first().getByText("Tracked", { exact: true }),
    ).toBeVisible({ timeout: 10000 });

    // Interaction lands on the interactions page.
    await page.goto("/interactions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(note)).toBeVisible({ timeout: 15000 });
  });
});
