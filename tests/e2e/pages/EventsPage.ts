import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class EventsPage extends BasePage {
  async goto() {
    await super.goto("/events");
  }

  async navigateToEvents() {
    await this.click('[data-testid="nav-events"]');
    await this.waitForURL("/events");
  }

  // Event Management
  async clickAddEvent() {
    await this.click('[data-testid="add-event-button"]');
    await this.waitForURL("/events/create");
  }

  async expectEventsVisible() {
    await this.expectVisible('[data-testid="page-title"]');
    await this.expectVisible("text=Events");
    await this.expectVisible("text=Track camps, showcases, visits, and games");
  }

  async getEventCount(): Promise<number> {
    // Look for event count in the page
    const countElements = await this.page
      .locator("text=events, text=total, .event-count")
      .first();
    if (await countElements.isVisible()) {
      const countText = await countElements.textContent();
      const match = countText?.match(/(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 0;
  }

  // Event Creation
  async createEvent(eventData: any) {
    // Wait for form to be ready
    await this.waitForElement(
      'input[name*="title"], input[data-testid*="title"], input[placeholder*="title"]',
    );

    // Fill event details
    if (eventData.title) {
      await this.fillInput(
        'input[name*="title"], input[data-testid*="title"], input[placeholder*="title"]',
        eventData.title,
      );
    }

    if (eventData.location) {
      await this.fillInput(
        'input[name*="location"], input[data-testid*="location"], input[placeholder*="location"]',
        eventData.location,
      );
    }

    if (eventData.date) {
      const dateInput = await this.page
        .locator('input[type="date"], input[data-testid*="date"]')
        .first();
      if (await dateInput.isVisible()) {
        await dateInput.fill(eventData.date);
      }
    }

    if (eventData.type) {
      await this.selectOption(
        'select[name*="type"], select[data-testid*="type"]',
        eventData.type,
      );
    }

    // Save event
    await this.click(
      'button:has-text("Save Event"), button:has-text("Create"), button[type="submit"]',
    );
    await this.page.waitForTimeout(2000);
  }

  // Event Filtering and Search
  async searchEvents(query: string) {
    const searchInput = await this.page
      .locator('input[placeholder*="Search"], input[data-testid*="search"]')
      .first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(query);
      await this.page.waitForTimeout(1000);
    }
  }

  async filterByType(eventType: string) {
    const typeFilter = await this.page
      .locator('select[name*="type"], select[data-testid*="type"]')
      .first();
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption(eventType);
      await this.page.waitForTimeout(1000);
    }
  }

  async filterByDateRange(startDate: string, endDate: string) {
    // Look for date filter controls
    const startDateInput = await this.page
      .locator('input[name*="start"], input[data-testid*="start"]')
      .first();
    const endDateInput = await this.page
      .locator('input[name*="end"], input[data-testid*="end"]')
      .first();

    if (await startDateInput.isVisible()) {
      await startDateInput.fill(startDate);
    }

    if (await endDateInput.isVisible()) {
      await endDateInput.fill(endDate);
    }

    await this.click('button:has-text("Apply"), button:has-text("Filter")');
    await this.page.waitForTimeout(1000);
  }

  // Event Interaction
  async clickEvent(eventName: string) {
    await this.click(`text=${eventName}`);
    await this.page.waitForTimeout(1000);
  }

  async editEvent(eventName: string) {
    // Click on event and wait for edit mode
    await this.click(`text=${eventName}`);
    await this.page.waitForTimeout(1000);

    // Look for edit button
    await this.click('button:has-text("Edit"), button[aria-label*="edit"]');
    await this.page.waitForTimeout(1000);
  }

  async deleteEvent(eventName: string) {
    await this.click(`text=${eventName}`);
    await this.page.waitForTimeout(1000);

    // Look for delete option
    const deleteButton = await this.page
      .locator('button:has-text("Delete"), button[aria-label*="delete"]')
      .first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await this.click('button:has-text("Confirm"), button:has-text("Yes")');
      await this.page.waitForTimeout(2000);
    }
  }

  // Event Details
  async expectEventDetails() {
    await this.expectVisible("text=Date, text=Location, text=Type");
  }

  async expectEventStatus(status: string) {
    await this.expectVisible(`text=${status}`);
  }

  // Calendar View
  async switchToCalendarView() {
    const calendarButton = await this.page
      .locator('button:has-text("Calendar"), button:has-text("View")')
      .first();
    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async switchToListView() {
    const listButton = await this.page
      .locator('button:has-text("List"), button:has-text("View")')
      .first();
    if (await listButton.isVisible()) {
      await listButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // Event Types
  async expectEventTypes() {
    await this.expectVisible("text=Camp, text=Showcase, text=Visit, text=Game");
  }

  async filterByEventType(eventType: string) {
    const typeFilter = await this.page
      .locator("text=Type")
      .locator("..")
      .locator("select, button")
      .first();
    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await this.page.waitForTimeout(500);
      await this.click(`text=${eventType}`);
      await this.page.waitForTimeout(500);
    }
  }

  // RSVP and Participation
  async rsvpForEvent(
    eventName: string,
    response: "attending" | "interested" | "declined",
  ) {
    await this.clickEvent(eventName);
    await this.page.waitForTimeout(1000);

    // Look for RSVP options
    const rsvpButton = await this.page
      .locator(`button:has-text("${response}")`)
      .first();
    if (await rsvpButton.isVisible()) {
      await rsvpButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // Event Statistics
  async expectEventStats() {
    await this.expectVisible("text=Total Events, text=Upcoming, text=Past");
  }

  // Timeline Status
  async expectTimelineStatus() {
    await this.expectVisible("text=Timeline, text=Status");
  }

  // Responsive Testing
  async testMobileEvents() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.goto();

    await this.expectEventsVisible();
  }

  async testDesktopEvents() {
    await this.page.setViewportSize({ width: 1200, height: 800 });
    await this.goto();

    await this.expectEventsVisible();
  }

  // Loading States
  async expectLoadingState() {
    await this.expectVisible(
      '[data-testid*="loading"], .loading, .animate-spin',
    );
  }

  async expectErrorState() {
    await this.expectVisible('[data-testid*="error"], .error, .bg-red-50');
  }

  // Event Reminders
  async setEventReminder(eventName: string, reminderTime: string) {
    await this.clickEvent(eventName);
    await this.page.waitForTimeout(1000);

    // Look for reminder option
    const reminderButton = await this.page
      .locator('button:has-text("Reminder"), button:has-text("Notification")')
      .first();
    if (await reminderButton.isVisible()) {
      await reminderButton.click();
      await this.page.waitForTimeout(500);
      // Set reminder time
      await this.selectOption(
        'select[name*="time"], select[data-testid*="time"]',
        reminderTime,
      );
    }
  }

  // Event Sharing
  async shareEvent(
    eventName: string,
    shareMethod: "email" | "link" | "social",
  ) {
    await this.clickEvent(eventName);
    await this.page.waitForTimeout(1000);

    // Look for share option
    const shareButton = await this.page
      .locator(
        `button:has-text("Share via ${shareMethod}"), button[aria-label*="share"]`,
      )
      .first();
    if (await shareButton.isVisible()) {
      await shareButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // Event Search and Filter Performance
  async expectFastSearch() {
    const startTime = Date.now();
    await this.searchEvents("test");
    await this.page.waitForTimeout(2000);
    const endTime = Date.now();
    const searchTime = endTime - startTime;

    if (searchTime > 3000) {
      throw new Error(`Event search took too long: ${searchTime}ms`);
    }
  }

  // Calendar Integration
  async expectCalendarIntegration() {
    // Look for calendar view or integration
    await this.expectVisible("text=Calendar, text=Timeline");
  }

  // Batch Operations
  async selectMultipleEvents(eventNames: string[]) {
    for (const event of eventNames) {
      await this.clickEvent(event);
      await this.page.keyboard.press("Control"); // Multi-select modifier
    }
  }

  async deleteMultipleEvents(eventNames: string[]) {
    for (const event of eventNames) {
      await this.deleteEvent(event);
      await this.page.waitForTimeout(1000);
    }
  }
}
