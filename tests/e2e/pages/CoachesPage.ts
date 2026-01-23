import { BasePage } from "./BasePage";

export class CoachesPage extends BasePage {
  async goto(schoolId?: string) {
    if (schoolId) {
      await super.goto(`/schools/${schoolId}/coaches`);
    } else {
      await super.goto("/coaches");
    }
  }

  async navigateToCoaches() {
    await this.click('[data-testid="nav-coaches"]');
    await this.waitForURL(/coaches/);
  }

  async clickAddCoach() {
    // Look for add coach button or navigate to add coach page
    const addCoachButton = await this.page
      .locator('a[href*="/coaches/new"], button:has-text("Add Coach")')
      .first();
    await addCoachButton.click();
    await this.waitForURL(/\/.*\/coaches\/new/);
  }

  async createCoach(coach: any) {
    // Wait for form to be ready
    await this.waitForElement("#firstName");

    await this.fillInput("#firstName", coach.firstName);
    await this.fillInput("#lastName", coach.lastName);
    await this.selectOption("#role", coach.role);
    await this.fillInput(
      'input[name*="email"], input[type="email"]',
      coach.email,
    );
    await this.fillInput(
      'input[name*="phone"], input[type="tel"]',
      coach.phone,
    );

    await this.click('[data-testid="add-coach-button"]');
    await this.page.waitForLoadState("networkidle");
  }

  async updateCoach(updates: any) {
    if (updates.firstName) {
      await this.fillInput(
        'input[placeholder*="first name"]',
        updates.firstName,
      );
    }
    if (updates.phone) {
      await this.fillInput('input[placeholder*="phone"]', updates.phone);
    }

    await this.clickByText("Save Changes");
  }

  async deleteCoach(coachName: string) {
    await this.click(
      `[data-testid="coach-${coachName}"] [data-testid="delete-button"]`,
    );
    await this.clickByText("Confirm Delete");
  }

  async expectCoachInList(firstName: string, lastName: string) {
    await this.expectVisible(`text=${firstName} ${lastName}`);
  }

  async viewCoachDetails(coachName: string) {
    await this.clickByText(coachName);
    await this.page.waitForLoadState("networkidle");
  }

  async getCoachResponsiveness() {
    return await this.getText('[data-testid="responsiveness-score"]');
  }

  async getLastContactDate() {
    return await this.getText('[data-testid="last-contact-date"]');
  }

  async getCoachCount(): Promise<number> {
    // Look for coach cards or list items
    const cards = await this.page
      .locator('[data-testid="coach-card"], .coach-card, .card')
      .count();
    return cards;
  }

  async viewCoachAnalytics() {
    await this.click('[data-testid="analytics-tab"]');
    await this.expectVisible('[data-testid="responsiveness-chart"]');
  }
}
