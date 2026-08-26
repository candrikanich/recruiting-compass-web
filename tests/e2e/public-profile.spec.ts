import { test, expect } from "@playwright/test";

/**
 * Public player profile page (`/p/:slug`) — unauthenticated smoke test.
 *
 * Scope intentionally limited to always-present elements. The only
 * published profile in the live DB (`owen-andrikanich-2028`) has its
 * metrics section HIDDEN in section_config, so this does not assert on
 * section content (covered by unit + component tests instead).
 */
const slug = process.env.E2E_PROFILE_SLUG ?? "owen-andrikanich-2028";

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

  // Player name renders in the hero heading.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /owen/i,
  );

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
