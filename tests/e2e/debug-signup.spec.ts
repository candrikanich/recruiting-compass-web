import { test } from "@playwright/test";
test("debug signup page", async ({ page }) => {
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('/signup');
  await page.waitForTimeout(5000);
  console.log('Final URL:', page.url());
  const html = await page.content();
  console.log('Has user-type-player:', html.includes('user-type-player'));
  console.log('Has UserTypeSelector:', html.includes('UserTypeSelector'));
});
