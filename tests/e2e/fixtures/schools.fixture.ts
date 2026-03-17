import { test, expect } from "@playwright/test";

/**
 * School data fixtures for E2E testing
 * Provides consistent test data across different test scenarios
 */

export const schoolFixtures = {
  /**
   * Minimal valid school data for basic CRUD operations
   */
  minimal: {
    name: "State University",
    location: "Austin, TX",
    division: "D1",
    status: "researching",
  },

  /**
   * Complete school data with all fields populated
   */
  complete: {
    name: "University of Excellence",
    location: "Boston, MA",
    division: "D1",
    status: "interested",
    conference: "ACC",
    website: "https://uoe.edu",
    twitter_handle: "@UofExcellence",
    instagram_handle: "uofexcellence",
    notes: "Strong baseball program with great facilities",
    pros: ["Excellent coaching staff", "Strong academics", "Beautiful campus"],
    cons: ["Far from home", "Cold winters", "High tuition"],
  },

  /**
   * School data for testing validation (invalid scenarios)
   */
  invalid: {
    emptyName: {
      name: "",
      location: "Test City",
      division: "D1",
      status: "researching",
    },
    emptyLocation: {
      name: "Test School",
      location: "",
      division: "D1",
      status: "researching",
    },
    noDivision: {
      name: "Test School",
      location: "Test City",
      division: "",
      status: "researching",
    },
  },

  /**
   * School data for testing updates
   */
  updateData: {
    name: "Updated University Name",
    location: "Miami, FL",
    division: "D2",
    status: "offer_received",
    conference: "Sun Belt",
    website: "https://updated.edu",
    twitter_handle: "@UpdatedUni",
    instagram_handle: "updateduniversity",
    notes: "Updated notes with new information",
    pros: ["New pro 1", "New pro 2"],
    cons: ["New con 1", "New con 2"],
  },

  /**
   * Schools for testing different divisions
   */
  divisions: {
    d1: {
      name: "Division 1 School",
      location: "College Town, USA",
      division: "D1",
      status: "researching",
    },
    d2: {
      name: "Division 2 School",
      location: "University City, USA",
      division: "D2",
      status: "researching",
    },
    d3: {
      name: "Division 3 School",
      location: "Liberal Arts Town, USA",
      division: "D3",
      status: "researching",
    },
    juco: {
      name: "Junior College",
      location: "Community City, USA",
      division: "JUCO",
      status: "researching",
    },
  },

  /**
   * Schools for testing different statuses
   */
  statuses: {
    researching: {
      name: "Research Target",
      location: "Research City",
      division: "D1",
      status: "researching",
    },
    contacted: {
      name: "Contacted School",
      location: "Contact City",
      division: "D1",
      status: "contacted",
    },
    interested: {
      name: "Interesting School",
      location: "Interest City",
      division: "D1",
      status: "interested",
    },
    offerReceived: {
      name: "Offer School",
      location: "Offer City",
      division: "D1",
      status: "offer_received",
    },
    declined: {
      name: "Declined School",
      location: "Decline City",
      division: "D1",
      status: "declined",
    },
    committed: {
      name: "Committed School",
      location: "Commit City",
      division: "D1",
      status: "committed",
    },
  },

  /**
   * Schools with special characters and edge cases
   */
  edgeCases: {
    specialChars: {
      name: "O'Connor State University",
      location: "St. John's, NL",
      division: "D1",
      status: "researching",
    },
    longName: {
      name: "The Very Long and Elaborate University Name That Might Break UI Components",
      location: "Longcity, ST",
      division: "D1",
      status: "researching",
    },
    unicode: {
      name: "Université de Montréal",
      location: "Montréal, QC",
      division: "U-Sports",
      status: "researching",
    },
  },
};

/**
 * Helper function to create test school data with overrides
 */
export function createSchoolData(overrides = {}) {
  return {
    ...schoolFixtures.minimal,
    ...overrides,
  };
}

/**
 * Helper function to generate unique school names to avoid conflicts
 */
export function generateUniqueSchoolName(prefix = "Test School") {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix} ${timestamp}-${random}`;
}

/**
 * School form selectors for E2E testing
 */
export const schoolSelectors = {
  // Navigation
  schoolsLink: "text=Schools",
  addSchoolButton: ':is(button, a):has-text("Add School")',
  backButton: 'a:has-text("Back to Schools")',

  // Form fields (uses DesignSystemFormInput placeholders — no name= attributes)
  autocompleteToggle: 'input[type="checkbox"]',
  nameInput: 'input[placeholder="e.g., University of Florida"]',
  locationInput: 'input[placeholder="e.g., Gainesville, Florida"]',
  divisionSelect: 'select',
  statusSelect: '#school-status',
  conferenceInput: 'input[placeholder*="SEC"], input[placeholder*="Conference"], input[placeholder*="conference"]',
  websiteInput: 'input[placeholder*="http"], input[placeholder*="website"]',
  twitterInput: 'input[placeholder*="twitter"], input[placeholder*="Twitter"]',
  instagramInput: 'input[placeholder*="instagram"], input[placeholder*="Instagram"]',
  notesTextarea: 'textarea',

  // Pro/Con sections
  prosContainer: '[data-testid="pros-section"], .pros-section',
  consContainer: '[data-testid="cons-section"], .cons-section',
  addProButton: 'button:has-text("Add Pro")',
  addConButton: 'button:has-text("Add Con")',

  // Form actions — submit button has data-testid
  createButton: '[data-testid="add-school-button"]',
  updateButton: 'button:has-text("Update School")',
  deleteButton: 'button:has-text("Delete")',
  favoriteButton: 'button:has-text("⭐"), .favorite-button',
  confirmDeleteButton: 'button:has-text("Confirm")',
  cancelButton: 'button:has-text("Cancel")',

  // School detail elements — selectors match SchoolDetailHeader.vue
  schoolName: "h1.text-2xl",
  schoolLocation: "h1.text-2xl + div", // sibling div immediately after h1 contains location
  schoolDivision: "span.bg-blue-100.text-blue-700", // division badge
  schoolStatus: 'select[name="status"]',
  schoolNotes: '[data-testid="school-notes"], .notes-section',
  schoolPros: '[data-testid="school-pros"], .pros-list',
  schoolCons: '[data-testid="school-cons"], .cons-list',

  // Error and validation
  errorMessage: '.error-message, [data-testid="error"]',
  validationError: '.validation-error, [data-testid="validation-error"]',
  successMessage: '.success-message, [data-testid="success"]',
};

/**
 * Notes fixtures for testing notes editing
 */
export const notesFixtures = {
  shared:
    "Great coaching staff. Strong academic programs. Beautiful campus located in the mountains.",
  long: "Lorem ipsum dolor sit amet. ".repeat(100),
  special: 'Contains "quotes", line\nbreaks, and special chars: @#$%',
};

/**
 * Notes selectors for E2E testing
 */
export const notesSelectors = {
  sharedNotesSection: 'h2.text-lg.font-semibold:has-text("Notes")',
  editButton: 'button[aria-label="Edit notes"]',
  cancelButton: 'button[aria-label="Cancel editing notes"]',
  saveButton: 'button:has-text("Save Notes")',
  notesTextarea: '#notes-textarea',
  notesDisplay: ".text-slate-700.text-sm.whitespace-pre-wrap",
};

/**
 * Status history selectors for E2E testing
 */
export const statusHistorySelectors = {
  heading: 'h3:has-text("Status History")',
  loadingSpinner: ".animate-spin",
  emptyState: "text=No status changes yet",
  historyEntry: ".flex.items-start.gap-4",
  statusBadge: ".px-2.py-1.text-xs.font-medium.rounded-full",
  arrowIcon: "svg.w-4.h-4",
  timestamp: ".text-xs.text-slate-400",
  userName: ".flex.items-start.gap-4 .text-sm.text-slate-600",
  errorMessage: ".bg-red-50",
};

/**
 * Sidebar selectors for E2E testing
 */
export const sidebarSelectors = {
  quickActions: 'h3:has-text("Quick Actions")',
  logInteractionLink: 'a:has-text("Log Interaction"):first-of-type, a:has-text("Log Interaction")',
  sendEmailButton: 'button:has-text("Send Email")',
  manageCoachesLink: 'a[href*="/coaches"]',
  coachesList: ".space-y-3",
  coachCard: ".p-3.border.border-slate-200.rounded-lg",
  coachName: ".font-medium.text-slate-900.text-sm",
  coachRole: ".text-xs.text-slate-500.capitalize",
  emailIcon: 'a[href^="mailto:"]',
  phoneIcon: 'a[href^="tel:"]',
  smsIcon: 'a[href^="sms:"]',
  emptyCoachState: "text=No coaches added yet",
  attributionSection: 'h4:has-text("Attribution")',
  createdBy: "text=Created by:",
  lastUpdated: "text=Last updated:",
  deleteButton: 'button:has-text("Delete School")',
  confirmDialog: '[role="dialog"]',
  confirmDeleteButton:
    'button:has-text("Delete"):not(:has-text("Delete School"))',
  cancelDialogButton: 'button:has-text("Cancel")',
};

/**
 * Helper functions for school E2E operations
 */
export const schoolHelpers = {
  /**
   * Fill school form with given data
   */
  async fillSchoolForm(page, schoolData) {
    if (schoolData.name) {
      await page.fill(schoolSelectors.nameInput, schoolData.name);
    }
    if (schoolData.location) {
      await page.fill(schoolSelectors.locationInput, schoolData.location);
    }
    if (schoolData.division) {
      await page.getByLabel("Division").selectOption(schoolData.division);
    }
    if (schoolData.status) {
      // Status select has label "Initial Status" in the add form
      await page.getByLabel(/Status/i).selectOption(schoolData.status);
    }
    if (schoolData.conference) {
      await page.fill(schoolSelectors.conferenceInput, schoolData.conference);
    }
    if (schoolData.website) {
      await page.fill(schoolSelectors.websiteInput, schoolData.website);
    }
    if (schoolData.twitter_handle) {
      await page.fill(schoolSelectors.twitterInput, schoolData.twitter_handle);
    }
    if (schoolData.instagram_handle) {
      await page.fill(
        schoolSelectors.instagramInput,
        schoolData.instagram_handle,
      );
    }
    if (schoolData.notes) {
      await page.fill(schoolSelectors.notesTextarea, schoolData.notes);
    }
  },

  /**
   * Add pros to school form
   */
  async addPros(page, pros) {
    for (const pro of pros) {
      await page.click(schoolSelectors.addProButton);
      await page.fill(`${schoolSelectors.prosContainer} input:last-child`, pro);
    }
  },

  /**
   * Add cons to school form
   */
  async addCons(page, cons) {
    for (const con of cons) {
      await page.click(schoolSelectors.addConButton);
      await page.fill(`${schoolSelectors.consContainer} input:last-child`, con);
    }
  },

  /**
   * Navigate to schools page
   */
  async navigateToSchools(page) {
    await page.goto("/schools");
    await page.waitForLoadState("networkidle");
  },

  /**
   * Create a new school and return its ID
   */
  async createSchool(page, schoolData) {
    // Navigate directly to the new school form (avoids needing nav header to be visible)
    await page.goto("/schools/new");
    await page.waitForLoadState("networkidle");

    // Disable autocomplete to enable manual form entry (autocomplete is on by default)
    const autocompleteToggle = page.locator(schoolSelectors.autocompleteToggle).first();
    const isChecked = await autocompleteToggle.isChecked().catch(() => false);
    if (isChecked) {
      await autocompleteToggle.uncheck();
      await page.waitForTimeout(300); // wait for form to switch to manual mode
    }

    await schoolHelpers.fillSchoolForm(page, schoolData);

    if (schoolData.pros) {
      await schoolHelpers.addPros(page, schoolData.pros);
    }
    if (schoolData.cons) {
      await schoolHelpers.addCons(page, schoolData.cons);
    }

    await page.click(schoolSelectors.createButton);
    await page.waitForURL(/\/schools\/[a-f0-9-]+/);

    return page.url().split("/").pop();
  },

  /**
   * Navigate to school detail page
   */
  async navigateToSchool(page, schoolId) {
    await page.goto(`/schools/${schoolId}`);
    await page.waitForSelector(schoolSelectors.schoolName);
  },

  /**
   * Verify school data is displayed correctly
   */
  async verifySchoolData(page, expectedData) {
    if (expectedData.name) {
      await expect(page.locator(schoolSelectors.schoolName)).toContainText(
        expectedData.name,
      );
    }
    if (expectedData.location) {
      await expect(page.locator(schoolSelectors.schoolLocation)).toContainText(
        expectedData.location,
      );
    }
    if (expectedData.division) {
      await expect(page.locator(schoolSelectors.schoolDivision)).toContainText(
        expectedData.division,
      );
    }
    if (expectedData.notes) {
      await expect(page.locator(schoolSelectors.schoolNotes)).toContainText(
        expectedData.notes,
      );
    }
  },

  /**
   * Wait for school detail page to load completely
   */
  async waitForSchoolDetailLoad(page) {
    await page.waitForSelector(schoolSelectors.schoolName, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
  },

  /**
   * Create a school with status change history
   */
  async createSchoolWithHistory(page, statusChanges) {
    const schoolData = createSchoolData({
      name: generateUniqueSchoolName("History Test"),
    });
    const schoolId = await schoolHelpers.createSchool(page, schoolData);

    for (const status of statusChanges) {
      await schoolHelpers.changeSchoolStatus(page, schoolId, status);
    }

    return schoolId;
  },

  /**
   * Change school status
   */
  async changeSchoolStatus(page, schoolId, newStatus) {
    await page.goto(`/schools/${schoolId}`);
    await page.waitForLoadState("networkidle");

    // Use getByLabel to find the status select (has sr-only label "School status")
    const statusSelect = page.getByLabel("School status");
    await statusSelect.waitFor({ state: "visible" });
    await page.waitForFunction(
      () => !document.getElementById("school-status")?.hasAttribute("disabled"),
    );
    await statusSelect.selectOption(newStatus);
    await page.waitForLoadState("networkidle");
  },

  /**
   * Add coach to school
   */
  async addCoachToSchool(page, schoolId, coachData) {
    await page.goto(`/schools/${schoolId}/coaches`);
    await page.waitForLoadState("networkidle");

    await page.click('button:has-text("Add Coach")');
    // Coach form renders inline (v-if) — wait for it to appear
    await page.waitForSelector('h2:has-text("Add New Coach")', { timeout: 5000 });

    if (coachData.firstName) {
      await page.fill('input[placeholder="e.g., John"]', coachData.firstName);
    }
    if (coachData.lastName) {
      await page.fill('input[placeholder="e.g., Smith"]', coachData.lastName);
    }
    if (coachData.role) {
      // Use form element to scope to the add form, not the filter bar
      await page.locator('form').getByLabel("Role").selectOption(coachData.role);
    }
    if (coachData.email) {
      await page.fill('input[type="email"]', coachData.email);
    }
    if (coachData.phone) {
      await page.fill('input[type="tel"], input[placeholder*="555"]', coachData.phone);
    }

    await page.click('[data-testid="add-coach-button"]');
    await page.waitForLoadState("networkidle");
  },
};
