"use strict";

const BASE_URL = process.env.LHCI_BASE_URL;
const PROFILE_SLUG = process.env.LHCI_PROFILE_SLUG;

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      puppeteerScript: "./scripts/lhci-auth.cjs",
      url: [
        `${BASE_URL}/login`,
        `${BASE_URL}/p/${PROFILE_SLUG}`,
        `${BASE_URL}/dashboard`,
        `${BASE_URL}/schools`,
        `${BASE_URL}/coaches`,
      ],
      settings: {
        // Required for Chrome in CI / Docker environments
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
      },
    },
    // Budgets are warn-only: an SPA (ssr:false) yields noisy lab scores, so a
    // regression surfaces in the LHCI report + Slack post without ever failing
    // the build. Tighten to "error" once baselines prove stable per page.
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.6 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
