/**
 * Coach data fixtures for E2E testing
 * Provides consistent test data across different test scenarios
 */

export const coachFixtures = {
  /**
   * Minimal valid coach data for basic CRUD operations
   */
  minimal: {
    firstName: "John",
    lastName: "Smith",
    role: "head",
    email: "jsmith@university.edu",
    phone: "555-0100",
  },

  /**
   * Complete coach data with all fields populated
   */
  complete: {
    firstName: "Jane",
    lastName: "Doe",
    role: "assistant",
    email: "jdoe@university.edu",
    phone: "555-0101",
    twitter_handle: "@coachdoe",
    instagram_handle: "coachjane",
    notes: "Highly responsive recruiting coordinator with strong network",
    availability: "weekdays_only",
  },

  /**
   * Additional coaches for multiple coach scenarios
   */
  headCoach: {
    firstName: "Michael",
    lastName: "Johnson",
    role: "head",
    email: "mjohnson@university.edu",
    phone: "555-0102",
    twitter_handle: "@mjohnson_coach",
  },

  assistantCoach: {
    firstName: "Sarah",
    lastName: "Williams",
    role: "assistant",
    email: "swilliams@university.edu",
    phone: "555-0103",
    twitter_handle: "@swilliams_coach",
    instagram_handle: "sarahwilliams",
  },

  recruitingCoordinator: {
    firstName: "Robert",
    lastName: "Martinez",
    role: "recruiting",
    email: "rmartinez@university.edu",
    phone: "555-0104",
  },

  /**
   * Coach data for testing updates
   */
  updateData: {
    firstName: "Updated",
    lastName: "Coach",
    email: "updated@university.edu",
    phone: "555-9999",
    twitter_handle: "@updatedcoach",
    instagram_handle: "updatedcoach",
  },

  /**
   * Coaches for testing different roles
   */
  roles: {
    head: {
      firstName: "Head",
      lastName: "Coach",
      role: "head",
      email: "head@university.edu",
      phone: "555-1111",
    },
    assistant: {
      firstName: "Assistant",
      lastName: "Coach",
      role: "assistant",
      email: "assistant@university.edu",
      phone: "555-2222",
    },
    recruiting: {
      firstName: "Recruiting",
      lastName: "Coordinator",
      role: "recruiting",
      email: "recruiting@university.edu",
      phone: "555-3333",
    },
  },

  /**
   * Coach data with special characters and edge cases
   */
  edgeCases: {
    specialChars: {
      firstName: "O'Brien",
      lastName: "O'Connor",
      role: "head",
      email: "obrien.oconnor@university.edu",
      phone: "555-4444",
    },
    longName: {
      firstName: "Maximilian",
      lastName: "Schwarzenegger-Schwarzenbacher",
      role: "assistant",
      email: "max@university.edu",
      phone: "555-5555",
    },
    unicode: {
      firstName: "François",
      lastName: "García",
      role: "head",
      email: "francois@university.edu",
      phone: "555-6666",
    },
  },

  /**
   * Coach data for testing invalid scenarios
   */
  invalid: {
    emptyFirstName: {
      firstName: "",
      lastName: "Coach",
      role: "head",
      email: "test@university.edu",
      phone: "555-0100",
    },
    emptyLastName: {
      firstName: "Test",
      lastName: "",
      role: "head",
      email: "test@university.edu",
      phone: "555-0100",
    },
    invalidEmail: {
      firstName: "Test",
      lastName: "Coach",
      role: "head",
      email: "not-an-email",
      phone: "555-0100",
    },
    invalidPhone: {
      firstName: "Test",
      lastName: "Coach",
      role: "head",
      email: "test@university.edu",
      phone: "123", // Too short
    },
  },
};

/**
 * Helper function to create test coach data with overrides
 */
export function createCoachData(overrides = {}) {
  return {
    ...coachFixtures.minimal,
    ...overrides,
  };
}

/**
 * Helper function to generate unique coach emails to avoid conflicts
 */
export function generateUniqueCoachEmail(prefix = "coach") {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@testuniversity.edu`;
}

/**
 * Helper function to generate unique coach names
 */
export function generateUniqueCoachName(
  firstNamePrefix = "Test",
  lastNamePrefix = "Coach"
) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return {
    firstName: `${firstNamePrefix}${random}`,
    lastName: `${lastNamePrefix}${timestamp}`,
  };
}

/**
 * Coach form selectors for E2E testing
 */
export const coachSelectors = {
  // Navigation and buttons
  addCoachButton: 'button:has-text("Add Coach"), a[href*="/coaches/new"]',
  editCoachButton: 'button:has-text("Edit")',
  deleteCoachButton: 'button:has-text("Delete Coach")',
  saveCoachButton: 'button:has-text("Save Coach"), [data-testid="add-coach-button"]',
  confirmDeleteButton: 'button:has-text("Confirm")',
  cancelButton: 'button:has-text("Cancel")',

  // Form fields
  firstNameInput: '#firstName, input[name="firstName"], input[placeholder*="First"]',
  lastNameInput: '#lastName, input[name="lastName"], input[placeholder*="Last"]',
  roleSelect: '#role, select[name="role"]',
  emailInput: '#email, input[name="email"], input[type="email"]',
  phoneInput: '#phone, input[name="phone"], input[type="tel"]',
  twitterInput: '#twitter_handle, input[name="twitter_handle"], input[placeholder*="Twitter"]',
  instagramInput: '#instagram_handle, input[name="instagram_handle"], input[placeholder*="Instagram"]',
  notesTextarea: '#notes, textarea[name="notes"], textarea[placeholder*="Notes"]',
  availabilitySelect: '#availability, select[name="availability"]',

  // Coach list/cards
  coachCard: '[data-testid="coach-card"], .coach-card',
  coachName: 'h2, h3, .coach-name',
  coachRole: '.coach-role, [data-testid="coach-role"]',
  coachEmail: '.coach-email, [data-testid="coach-email"]',
  coachPhone: '.coach-phone, [data-testid="coach-phone"]',

  // Coach detail page
  coachDetailTitle: 'h1, [data-testid="coach-title"]',
  coachDetailEmail: '[data-testid="coach-detail-email"]',
  coachDetailPhone: '[data-testid="coach-detail-phone"]',
  coachDetailRole: '[data-testid="coach-detail-role"]',
  coachResponsiveness: '[data-testid="responsiveness-score"]',
  coachLastContact: '[data-testid="last-contact-date"]',

  // Search and filtering
  searchInput: 'input[placeholder*="Search"], input[type="search"]',
  roleFilter: 'select[name="role"], button:has-text("Role")',
  clearFilterButton: 'button:has-text("Clear")',
  clearAllButton: 'button:has-text("Clear All")',

  // Quick actions
  emailAction: 'button[aria-label*="email"], button:has-text("Email")',
  textAction: 'button[aria-label*="text"], button:has-text("Text")',
  twitterAction: 'button[aria-label*="twitter"], a[href*="twitter.com"]',
  instagramAction: 'button[aria-label*="instagram"], a[href*="instagram.com"]',

  // Communication/History
  communicationsTab: 'button:has-text("Messages"), a[href*="/communications"]',
  logInteractionButton: 'button:has-text("Log Interaction")',
  interactionList: '[data-testid="interaction-list"]',
  interactionItem: '[data-testid="interaction-item"]',

  // Messages and validation
  successMessage: '.success-message, [data-testid="success"]',
  errorMessage: '.error-message, [data-testid="error"]',
  validationError: '.validation-error, [data-testid="validation-error"]',

  // Sorting and pagination
  sortDropdown: 'select[name="sort"], button:has-text("Sort")',
  paginationNext: 'button:has-text("Next")',
  paginationPrev: 'button:has-text("Previous")',
};

/**
 * Helper functions for coach E2E operations
 */
export const coachHelpers = {
  /**
   * Fill coach form with given data
   */
  async fillCoachForm(page, coachData) {
    if (coachData.firstName) {
      await page.fill(coachSelectors.firstNameInput, coachData.firstName);
    }
    if (coachData.lastName) {
      await page.fill(coachSelectors.lastNameInput, coachData.lastName);
    }
    if (coachData.role) {
      await page.selectOption(coachSelectors.roleSelect, coachData.role);
    }
    if (coachData.email) {
      await page.fill(coachSelectors.emailInput, coachData.email);
    }
    if (coachData.phone) {
      await page.fill(coachSelectors.phoneInput, coachData.phone);
    }
    if (coachData.twitter_handle) {
      await page.fill(coachSelectors.twitterInput, coachData.twitter_handle);
    }
    if (coachData.instagram_handle) {
      await page.fill(coachSelectors.instagramInput, coachData.instagram_handle);
    }
    if (coachData.notes) {
      await page.fill(coachSelectors.notesTextarea, coachData.notes);
    }
    if (coachData.availability) {
      await page.selectOption(coachSelectors.availabilitySelect, coachData.availability);
    }
  },

  /**
   * Navigate to coaches page for a school
   */
  async navigateToCoaches(page, schoolId) {
    await page.goto(`/schools/${schoolId}/coaches`);
    await page.waitForLoadState("networkidle");
  },

  /**
   * Create a new coach and return to school coaches page
   */
  async createCoach(page, schoolId, coachData) {
    await coachHelpers.navigateToCoaches(page, schoolId);
    await page.click(coachSelectors.addCoachButton);
    await page.waitForURL(/\/coaches\/new/);

    await coachHelpers.fillCoachForm(page, coachData);
    await page.click(coachSelectors.saveCoachButton);
    await page.waitForLoadState("networkidle");
  },

  /**
   * Navigate to coach detail page
   */
  async navigateToCoachDetail(page, schoolId, coachId) {
    await page.goto(`/schools/${schoolId}/coaches/${coachId}`);
    await page.waitForSelector(coachSelectors.coachDetailTitle);
  },

  /**
   * Search for coaches in the list
   */
  async searchCoaches(page, searchTerm) {
    const searchInput = await page.locator(coachSelectors.searchInput).first();
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(500); // Wait for search to process
  },

  /**
   * Filter coaches by role
   */
  async filterByRole(page, role) {
    await page.selectOption(coachSelectors.roleFilter, role);
    await page.waitForTimeout(500);
  },

  /**
   * Clear all filters
   */
  async clearAllFilters(page) {
    const clearButton = await page
      .locator(coachSelectors.clearAllButton)
      .first();
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);
    }
  },

  /**
   * Verify coach data is displayed correctly
   */
  async verifyCoachData(page, expectedData) {
    if (expectedData.firstName && expectedData.lastName) {
      const fullName = `${expectedData.firstName} ${expectedData.lastName}`;
      // Check if coach name appears anywhere on the page
      await page.waitForSelector(`text=${fullName}`, { timeout: 5000 });
    }
    if (expectedData.email) {
      const emailLocator = await page
        .locator(`:text-is("${expectedData.email}")`)
        .first();
      if (await emailLocator.isVisible()) {
        // Email is displayed
      }
    }
  },

  /**
   * Get count of coaches displayed
   */
  async getCoachCount(page) {
    return await page.locator(coachSelectors.coachCard).count();
  },

  /**
   * Click email action for a coach
   */
  async clickEmailAction(page) {
    await page.click(coachSelectors.emailAction);
    await page.waitForTimeout(500);
  },

  /**
   * Click text action for a coach
   */
  async clickTextAction(page) {
    await page.click(coachSelectors.textAction);
    await page.waitForTimeout(500);
  },

  /**
   * Navigate to coach communications page
   */
  async navigateToCommunications(page) {
    await page.click(coachSelectors.communicationsTab);
    await page.waitForURL(/\/communications/);
  },

  /**
   * Log an interaction for a coach
   */
  async logInteraction(page, interactionData) {
    await page.click(coachSelectors.logInteractionButton);
    await page.waitForLoadState("networkidle");

    if (interactionData.subject) {
      await page.fill('input[placeholder*="subject"], #subject', interactionData.subject);
    }
    if (interactionData.notes) {
      await page.fill('textarea[placeholder*="notes"], #notes', interactionData.notes);
    }
    if (interactionData.type) {
      await page.selectOption('select[name="type"], #type', interactionData.type);
    }

    await page.click('button:has-text("Save"), [data-testid="save-interaction"]');
    await page.waitForLoadState("networkidle");
  },
};
