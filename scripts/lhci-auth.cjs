'use strict';

/**
 * LHCI puppeteer script — authenticates before auditing protected pages.
 * Called by LHCI before each URL. The browser argument is LHCI's own
 * Chromium instance; do not import puppeteer here.
 *
 * @param {import('puppeteer').Browser} browser
 * @param {{ url: string }} context
 */
module.exports = async (browser, context) => {
  const url = new URL(context.url);

  // Skip auth for public routes — login page and public player profiles
  const publicPrefixes = ['/login', '/p/'];
  if (publicPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  const page = await browser.newPage();

  // Check if already authenticated: navigate to the target and see if
  // we land on it (authenticated) or get redirected to /login (not authenticated).
  await page.goto(context.url, { waitUntil: 'domcontentloaded' });

  if (!page.url().includes('/login')) {
    // Session cookies are still active — no login needed
    await page.close();
    return;
  }

  // Not authenticated — perform login
  await page.goto(`${url.origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 10_000 });
  await page.type('#email', process.env.LHCI_CI_EMAIL ?? '');
  await page.type('#password', process.env.LHCI_CI_PASSWORD ?? '');
  await page.click('[data-testid="login-button"]');
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.close();
};
