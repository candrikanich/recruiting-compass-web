import { BasePage } from "./BasePage";

export class InteractionsPage extends BasePage {
  async goto() {
    await super.goto("/interactions");
  }

  async navigateToInteractions() {
    await this.click('[data-testid="nav-interactions"]');
    await this.waitForURL("/interactions");
  }

  async clickLogInteraction() {
    await this.click('[data-testid="log-interaction-button"]');
    await this.waitForURL(/interactions\/add/);
  }

  async logInteraction(interaction: any) {
    // Wait for form to be ready
    await this.waitForElement("#schoolId");

    // Select school
    await this.selectOption("#schoolId", interaction.school);

    // Select coach (optional)
    if (interaction.coach) {
      await this.waitForElement("#coachId");
      await this.selectOption("#coachId", interaction.coach);
    }

    // Select type
    await this.selectOption(
      'select[name*="type"], select[id*="type"]',
      interaction.type,
    );

    // Select direction
    await this.selectOption(
      'select[name*="direction"], select[id*="direction"]',
      interaction.direction,
    );

    // Fill content
    if (interaction.subject) {
      await this.fillInput(
        'input[name*="subject"], input[placeholder*="subject"]',
        interaction.subject,
      );
    }
    await this.fillInput(
      'textarea[name*="content"], textarea[placeholder*="content"]',
      interaction.content,
    );

    // Select sentiment
    await this.selectOption(
      'select[name*="sentiment"], select[id*="sentiment"]',
      interaction.sentiment,
    );

    await this.click('[data-testid="log-interaction-submit-button"]');
    await this.page.waitForLoadState("networkidle");
  }

  async expectInteractionLogged(schoolName: string) {
    await this.goto();
    await this.expectVisible(`text=${schoolName}`);
  }

  async filterBySchool(schoolName: string) {
    await this.click('[data-testid="filter-button"]');
    await this.click('[data-testid="school-filter"]');
    await this.clickByText(schoolName);
  }

  async filterByType(type: string) {
    await this.click('[data-testid="filter-button"]');
    await this.selectOption('[data-testid="type-filter"]', type);
  }

  async filterBySentiment(sentiment: string) {
    await this.click('[data-testid="filter-button"]');
    await this.selectOption('[data-testid="sentiment-filter"]', sentiment);
  }

  async getInteractionCount(): Promise<number> {
    // Look for interaction cards or list items
    const cards = await this.page
      .locator('[data-testid="interaction-card"], .interaction-card, .card')
      .count();
    return cards;
  }

  async viewInteractionDetails(schoolName: string) {
    await this.click(`text=${schoolName}`);
    await this.page.waitForLoadState("networkidle");
  }

  async deleteInteraction(schoolName: string) {
    await this.click(
      `[data-testid="interaction-${schoolName}"] [data-testid="delete-button"]`,
    );
    await this.clickByText("Confirm Delete");
  }

  async exportInteractions(format: string) {
    await this.click('[data-testid="export-button"]');
    await this.clickByText(format);
    await this.page.waitForEvent("download");
  }
}
