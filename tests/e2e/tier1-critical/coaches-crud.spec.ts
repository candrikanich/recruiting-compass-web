import { test, expect, Browser } from "@playwright/test";
import { resolve } from "path";
import {
  coachFixtures,
  createCoachData,
  generateUniqueCoachEmail,
  generateUniqueCoachName,
  coachHelpers,
} from "../fixtures/coaches.fixture";
import {
  createSchoolData,
  generateUniqueSchoolName,
  schoolHelpers,
} from "../fixtures/schools.fixture";

/**
 * Coaches — non-lifecycle cases.
 *
 * The basic create → read → update → delete lifecycle is covered by
 * coaches-crud-atomic.spec.ts. This file holds the orthogonal cases that
 * one atomic test can't represent: fillability of every field, list
 * display with multiple coaches, role parameterization, input edge
 * cases, and XSS sanitization (security regression coverage).
 */
test.describe("Coaches — non-lifecycle cases", () => {
  test.setTimeout(120000);

  let schoolId: string;

  test.beforeAll(async ({ browser }: { browser: Browser }, testInfo) => {
    testInfo.setTimeout(120000);
    let ctx;
    try {
      ctx = await browser.newContext({
        storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
      });
      const page = await ctx.newPage();
      const schoolName = generateUniqueSchoolName("Coaches Edge-case School");
      const schoolData = createSchoolData({ name: schoolName });
      schoolId = await schoolHelpers.createSchool(page, schoolData);
    } catch (err) {
      console.warn("⚠️  beforeAll setup failed:", err);
    } finally {
      await ctx?.close().catch(() => {});
    }
  });

  test.beforeEach(() => {
    if (!schoolId) {
      test.skip(true, "beforeAll setup failed (Supabase unavailable)");
    }
  });

  test("creates a coach with every field populated", async ({ page }) => {
    const coachName = generateUniqueCoachName("Full", "Coach");
    const coachData = createCoachData({
      ...coachName,
      ...coachFixtures.complete,
      email: generateUniqueCoachEmail("full"),
    });

    await coachHelpers.createCoach(page, schoolId, coachData);

    await expect(
      page.getByRole("heading", {
        level: 3,
        name: `${coachData.firstName} ${coachData.lastName}`,
      }),
    ).toBeVisible();
    await expect(page.locator(`text=${coachData.email}`)).toBeVisible();
  });

  test("creates multiple coaches for the same school", async ({ page }) => {
    const coaches = [
      {
        ...generateUniqueCoachName("Head", "Coach"),
        ...coachFixtures.headCoach,
        email: generateUniqueCoachEmail("head"),
      },
      {
        ...generateUniqueCoachName("Assistant", "Coach"),
        ...coachFixtures.assistantCoach,
        email: generateUniqueCoachEmail("assistant"),
      },
      {
        ...generateUniqueCoachName("Recruiting", "Coordinator"),
        ...coachFixtures.recruitingCoordinator,
        email: generateUniqueCoachEmail("recruiting"),
      },
    ];

    for (const coach of coaches) {
      await coachHelpers.createCoach(page, schoolId, coach);
      await expect(
        page.getByRole("heading", {
          level: 3,
          name: `${coach.firstName} ${coach.lastName}`,
        }),
      ).toBeVisible();
    }
  });

  test("creates coaches with each supported role", async ({ page }) => {
    const roles = ["head", "assistant", "recruiting"];

    for (const role of roles) {
      const coachName = generateUniqueCoachName("Role", role);
      const coachData = createCoachData({
        ...coachName,
        role,
        email: generateUniqueCoachEmail(role),
        phone: "555-555-0100",
      });

      await coachHelpers.createCoach(page, schoolId, coachData);
      await expect(
        page.getByRole("heading", {
          level: 3,
          name: `${coachData.firstName} ${coachData.lastName}`,
        }),
      ).toBeVisible();
    }
  });

  test("handles special characters in coach names", async ({ page }) => {
    const coachData = createCoachData({
      firstName: "O'Brien",
      lastName: "O'Connor-Smith",
      email: generateUniqueCoachEmail("special"),
      phone: "555-555-0100",
    });

    await coachHelpers.createCoach(page, schoolId, coachData);
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: `${coachData.firstName} ${coachData.lastName}`,
      }),
    ).toBeVisible();
  });

  test("sanitizes malicious input (XSS prevention)", async ({ page }) => {
    const coachData = createCoachData({
      firstName: "Test<script>alert('xss')</script>",
      lastName: "Coach<img onerror='alert(1)'>",
      email: generateUniqueCoachEmail("xss"),
      phone: "555-555-0100",
    });

    await coachHelpers.createCoach(page, schoolId, coachData);

    // The core security assertion — no live script tag or attacker-controlled
    // attribute reached the DOM. We check element presence (not raw HTML
    // substrings), because Vue's escaped output still contains the literal
    // text "onerror=" inside encoded entities.
    expect(
      await page.locator("script:has-text(\"alert('xss')\")").count(),
    ).toBe(0);
    expect(await page.locator("img[onerror]").count()).toBe(0);
  });
});
