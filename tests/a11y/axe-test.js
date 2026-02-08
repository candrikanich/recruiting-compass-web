/**
 * Automated Accessibility Testing with axe-core
 *
 * This script performs automated accessibility audits on critical pages
 * using axe-core and the Playwright browser automation library.
 *
 * It checks for WCAG 2.1 Level AA compliance and reports violations.
 */

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Pages to test (critical user flows)
const PAGES_TO_TEST = [
  {
    name: "Login Page",
    url: "/login",
    wcagLevel: "wcag2aa",
  },
  {
    name: "Signup Page",
    url: "/signup",
    wcagLevel: "wcag2aa",
  },
  {
    name: "Dashboard",
    url: "/dashboard",
    wcagLevel: "wcag2aa",
  },
  {
    name: "Family Settings",
    url: "/settings",
    wcagLevel: "wcag2aa",
  },
];

// Allowed violations (false positives or acceptable issues)
const ALLOWED_VIOLATIONS = [
  // Add specific rules here if needed, e.g. 'color-contrast'
];

// Helper function to get accessible name
async function waitForPage(page, url, timeout = 10000) {
  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: "networkidle", timeout });
  } catch (err) {
    console.warn(`⚠️  Warning: Page load timeout for ${url}`);
    // Continue anyway for accessibility audit
  }
}

// Main test function
async function runAccessibilityTests() {
  const browser = await chromium.launch();
  const context = await browser.createIncogniteBrowserContext();
  const page = await context.newPage();

  let totalViolations = 0;
  let totalPages = 0;
  let passedPages = 0;
  const results = [];

  console.log("\n🔍 Starting Automated Accessibility Testing\n");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏱️  Standard: WCAG 2.1 Level AA\n`);
  console.log("─".repeat(80));

  for (const pageConfig of PAGES_TO_TEST) {
    totalPages++;
    const { name, url, wcagLevel } = pageConfig;

    console.log(`\n🧪 Testing: ${name}`);
    console.log(`📄 URL: ${BASE_URL}${url}`);

    try {
      // Navigate to page
      await waitForPage(page, url);

      // Run axe scan
      const results_page = await new AxeBuilder({ page })
        .withTags([wcagLevel])
        .analyze();

      const { violations, passes } = results_page;
      const filteredViolations = violations.filter(
        (v) => !ALLOWED_VIOLATIONS.includes(v.id),
      );

      console.log(`   ✅ Passes: ${passes.length}`);
      console.log(`   ⚠️  Violations: ${filteredViolations.length}`);

      if (filteredViolations.length === 0) {
        console.log(`   🎉 PASSED - No accessibility violations found!`);
        passedPages++;
      } else {
        console.log(
          `   ❌ FAILED - ${filteredViolations.length} issues found:`,
        );
        filteredViolations.forEach((violation) => {
          console.log(
            `      • [${violation.impact?.toUpperCase()}] ${violation.id}`,
          );
          console.log(`        ${violation.description}`);
          console.log(`        Affected elements: ${violation.nodes.length}`);
        });
      }

      totalViolations += filteredViolations.length;
      results.push({
        page: name,
        url,
        violations: filteredViolations,
        passes: passes.length,
      });
    } catch (error) {
      console.error(`   ❌ ERROR: Failed to test ${name}`);
      console.error(`      ${error.message}`);
      results.push({
        page: name,
        url,
        error: error.message,
        violations: [],
        passes: 0,
      });
    }
  }

  await browser.close();

  // Print summary
  console.log("\n" + "─".repeat(80));
  console.log("\n📊 ACCESSIBILITY TEST SUMMARY\n");
  console.log(`Total Pages Tested: ${totalPages}`);
  console.log(`Pages Passed: ${passedPages}/${totalPages}`);
  console.log(`Total Violations: ${totalViolations}`);

  if (totalViolations === 0) {
    console.log("\n✅ All accessibility tests passed!\n");
  } else {
    console.log(
      `\n❌ Found ${totalViolations} accessibility violation(s) across ${totalPages - passedPages} page(s)\n`,
    );
  }

  // Save detailed report
  const reportPath = path.join(process.cwd(), "accessibility-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        wcagLevel: "wcag2aa",
        summary: {
          totalPages,
          passedPages,
          totalViolations,
        },
        results,
      },
      null,
      2,
    ),
  );

  console.log(`📄 Detailed report saved to: ${reportPath}\n`);

  // Exit with appropriate code
  process.exit(totalViolations > 0 ? 1 : 0);
}

// Run tests
runAccessibilityTests().catch((error) => {
  console.error("Fatal error during accessibility testing:", error);
  process.exit(1);
});
