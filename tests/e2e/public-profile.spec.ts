import { test, expect } from "@playwright/test";

/**
 * Public player profile page (`/p/:slug`) — unauthenticated smoke test.
 *
 * Scope intentionally limited to always-present elements — asserts the hero
 * resolved (a name, not the not-found state) and the always-on controls,
 * never section content (that varies by section_config; covered by unit +
 * component tests). The default slug is the one the E2E seed publishes
 * (see tests/e2e/seed/seed.ts, E2E_PUBLIC_PROFILE_SLUG); override with
 * E2E_PROFILE_SLUG to point at a specific profile (e.g. a prod smoke run).
 */
const slug = process.env.E2E_PROFILE_SLUG ?? "e2e-test-player";

// No auth cookies — the profile page has no auth middleware and must
// render for a fully anonymous visitor.
test.use({ storageState: { cookies: [], origins: [] } });

test("public profile renders redesigned layout unauthenticated", async ({
  page,
}) => {
  const [profileResponse] = await Promise.all([
    page.waitForResponse((res) =>
      res.url().includes(`/api/public/profile/${slug}`),
    ),
    page.goto(`/p/${slug}`),
  ]);

  // Hero resolved to a real profile (a player name), not the not-found state.
  const heroHeading = page.getByRole("heading", { level: 1 });
  await expect(heroHeading).toBeVisible();
  await expect(heroHeading).not.toHaveText(/profile not found/i);

  // Contact / interest controls always render regardless of section_config.
  await expect(
    page.getByRole("button", { name: /contact player/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /express interest/i }),
  ).toBeVisible();

  // Footer branding always renders.
  await expect(page.getByText(/powered by/i)).toBeVisible();
  await expect(page.getByText(/recruitingcompass/i)).toBeVisible();

  // No PII leak in the network response or the rendered page: no email
  // address, no mailto:/tel: link exposing the athlete's contact info.
  const body = await profileResponse.text();
  expect(body).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);

  await expect(page.locator("a[href^='mailto:']")).toHaveCount(0);
  await expect(page.locator("a[href^='tel:']")).toHaveCount(0);
});
