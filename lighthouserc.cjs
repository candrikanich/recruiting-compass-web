'use strict';

const BASE_URL = process.env.LHCI_BASE_URL;
const PROFILE_SLUG = process.env.LHCI_PROFILE_SLUG;

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      puppeteerScript: './scripts/lhci-auth.cjs',
      url: [
        `${BASE_URL}/login`,
        `${BASE_URL}/p/${PROFILE_SLUG}`,
        `${BASE_URL}/dashboard`,
        `${BASE_URL}/schools`,
        `${BASE_URL}/coaches`,
      ],
      settings: {
        // Required for Chrome in CI / Docker environments
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
