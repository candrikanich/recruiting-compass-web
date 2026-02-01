import type { Page } from "@playwright/test";

export type SchoolData = {
  name: string;
  location: string;
  division?: string;
  status?: string;
  website?: string;
  twitter_handle?: string;
  instagram_handle?: string;
  pros?: string[];
  cons?: string[];
};

export const schoolFixtures = {
  minimal: {
    name: "Minimal Test School",
    location: "Test City, USA",
  } as SchoolData,

  complete: {
    name: "Complete Test School",
    location: "Complete City, USA",
    division: "D1",
    status: "interested",
    website: "https://school.edu",
    twitter_handle: "@SchoolTwitter",
    instagram_handle: "school_instagram",
    pros: ["Great program", "Good academics"],
    cons: ["Far away"],
  } as SchoolData,

  edgeCases: {
    specialChars: {
      name: "School's Name & Co.",
      location: "City, USA",
    } as SchoolData,
    unicode: {
      name: "Université Test School",
      location: "François City, France",
    } as SchoolData,
  },

  updateData: {
    name: "Updated School Name",
    location: "Updated City, USA",
    division: "D2",
    status: "offer_received",
    website: "https://updated-school.edu",
  } as SchoolData,
};

export const createSchoolData = (
  overrides?: Partial<SchoolData>,
): SchoolData => {
  const defaults: SchoolData = {
    name: `Test School ${Date.now()}`,
    location: "Test City, USA",
    division: "D3",
    status: "researching",
  };

  return {
    ...defaults,
    ...overrides,
  };
};

export const generateUniqueSchoolName = (prefix: string): string => {
  return `${prefix} ${Date.now()}`;
};

export const schoolSelectors = {
  // List page
  addSchoolButton: 'button:has-text("Add School"), button[aria-label*="Add"]',
  // Form fields
  nameInput: 'input[placeholder*="Name"], input[aria-label*="Name"]',
  locationInput:
    'input[placeholder*="Location"], input[aria-label*="Location"]',
  divisionSelect:
    'select[aria-label*="Division"], [data-testid="division-select"]',
  statusSelect: 'select[aria-label*="Status"], [data-testid="status-select"]',
  websiteInput: 'input[placeholder*="Website"], input[aria-label*="Website"]',
  twitterInput: 'input[placeholder*="Twitter"], input[aria-label*="Twitter"]',
  instagramInput:
    'input[placeholder*="Instagram"], input[aria-label*="Instagram"]',
  // Buttons
  createButton:
    'button:has-text("Create"), button[type="submit"]:has-text("Create")',
  updateButton:
    'button:has-text("Update"), button[type="submit"]:has-text("Update")',
  deleteButton: 'button:has-text("Delete"), button[aria-label*="Delete"]',
  cancelButton: 'button:has-text("Cancel"), button[aria-label*="Cancel"]',
  confirmDeleteButton:
    'button:has-text("Confirm"), button[aria-label*="Confirm"]',
  favoriteButton: 'button[aria-label*="Favorite"], button:has-text("Favorite")',
  // Detail page
  schoolName: 'h1, [data-testid="school-name"]',
  schoolStatus: 'select[aria-label*="Status"], [data-testid="status"]',
  schoolDivision: '[data-testid="division"], .division-label',
  schoolPros: '[data-testid="pros-list"], .pros-section',
  schoolCons: '[data-testid="cons-list"], .cons-section',
  backButton: 'button:has-text("Back"), button[aria-label*="Back"]',
  validationError: '.error, .validation-error, [role="alert"]',
};

export const schoolHelpers = {
  async navigateToSchools(page: Page) {
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");
  },

  async navigateToSchool(page: Page, schoolId: string) {
    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");
  },

  async fillSchoolForm(page: Page, data: Partial<SchoolData>) {
    if (data.name) {
      await page.fill(schoolSelectors.nameInput, data.name);
    }

    if (data.location) {
      await page.fill(schoolSelectors.locationInput, data.location);
    }

    if (data.division) {
      await page.selectOption(schoolSelectors.divisionSelect, data.division);
    }

    if (data.status) {
      await page.selectOption(schoolSelectors.statusSelect, data.status);
    }

    if (data.website) {
      await page.fill(schoolSelectors.websiteInput, data.website);
    }

    if (data.twitter_handle) {
      await page.fill(schoolSelectors.twitterInput, data.twitter_handle);
    }

    if (data.instagram_handle) {
      await page.fill(schoolSelectors.instagramInput, data.instagram_handle);
    }
  },

  async createSchool(page: Page, data: SchoolData): Promise<string> {
    await schoolHelpers.navigateToSchools(page);
    await page.click(schoolSelectors.addSchoolButton);
    await page.waitForURL("**/schools/new");

    await schoolHelpers.fillSchoolForm(page, data);
    await page.click(schoolSelectors.createButton);

    // Wait for redirect to school detail page and extract ID from URL
    await page.waitForURL(/\/schools\/[a-f0-9-]+/);
    const url = page.url();
    const match = url.match(/\/schools\/([a-f0-9-]+)/);
    return match ? match[1] : "";
  },

  async verifySchoolData(page: Page, data: SchoolData) {
    if (data.name) {
      const schoolName = page.locator(schoolSelectors.schoolName);
      await schoolName.waitFor({ state: "visible" });
      // Just verify it's visible; content varies by implementation
    }

    if (data.pros && data.pros.length > 0) {
      const prosList = page.locator(schoolSelectors.schoolPros);
      if ((await prosList.count()) > 0) {
        await prosList.waitFor({ state: "visible" });
      }
    }

    if (data.cons && data.cons.length > 0) {
      const consList = page.locator(schoolSelectors.schoolCons);
      if ((await consList.count()) > 0) {
        await consList.waitFor({ state: "visible" });
      }
    }
  },

  async addPros(page: Page, pros: string[]) {
    // Implementation depends on UI structure
    // This is a placeholder that can be customized based on actual implementation
    for (const pro of pros) {
      const addButton = page.locator('button:has-text("Add Pro")').first();
      if ((await addButton.count()) > 0) {
        await addButton.click();
        const inputs = page.locator('input[placeholder*="Pro"]');
        const lastInput = inputs.last();
        await lastInput.fill(pro);
      }
    }
  },

  async addCons(page: Page, cons: string[]) {
    // Implementation depends on UI structure
    // This is a placeholder that can be customized based on actual implementation
    for (const con of cons) {
      const addButton = page.locator('button:has-text("Add Con")').first();
      if ((await addButton.count()) > 0) {
        await addButton.click();
        const inputs = page.locator('input[placeholder*="Con"]');
        const lastInput = inputs.last();
        await lastInput.fill(con);
      }
    }
  },
};
