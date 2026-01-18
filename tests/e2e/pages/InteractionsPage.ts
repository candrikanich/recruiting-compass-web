import { BasePage } from './BasePage'

export class InteractionsPage extends BasePage {
  async goto() {
    await super.goto('/interactions')
  }

  async navigateToInteractions() {
    await this.click('[data-testid="nav-interactions"]')
    await this.waitForURL('/interactions')
  }

  async clickLogInteraction() {
    await this.clickByText('Log Interaction')
    await this.waitForURL(/interactions\/new/)
  }

  async logInteraction(interaction: any) {
    // Select school
    await this.click('[data-testid="school-select"]')
    await this.page.waitForLoadState('networkidle')
    await this.clickByText(interaction.school)

    // Select coach
    if (interaction.coach) {
      await this.click('[data-testid="coach-select"]')
      await this.clickByText(interaction.coach)
    }

    // Select type
    await this.selectOption('[data-testid="type-select"]', interaction.type)

    // Select direction
    await this.selectOption('[data-testid="direction-select"]', interaction.direction)

    // Fill content
    if (interaction.subject) {
      await this.fillInput('[placeholder*="subject"]', interaction.subject)
    }
    await this.fillInput('[placeholder*="content"]', interaction.content)

    // Select sentiment
    await this.selectOption('[data-testid="sentiment-select"]', interaction.sentiment)

    await this.clickByText('Log Interaction')
    await this.page.waitForLoadState('networkidle')
  }

  async expectInteractionLogged(schoolName: string) {
    await this.goto()
    await this.expectVisible(`text=${schoolName}`)
  }

  async filterBySchool(schoolName: string) {
    await this.click('[data-testid="filter-button"]')
    await this.click('[data-testid="school-filter"]')
    await this.clickByText(schoolName)
  }

  async filterByType(type: string) {
    await this.click('[data-testid="filter-button"]')
    await this.selectOption('[data-testid="type-filter"]', type)
  }

  async filterBySentiment(sentiment: string) {
    await this.click('[data-testid="filter-button"]')
    await this.selectOption('[data-testid="sentiment-filter"]', sentiment)
  }

  async getInteractionCount(): Promise<number> {
    return await this.getCount('[data-testid="interaction-card"]')
  }

  async viewInteractionDetails(schoolName: string) {
    await this.click(`text=${schoolName}`)
    await this.page.waitForLoadState('networkidle')
  }

  async deleteInteraction(schoolName: string) {
    await this.click(`[data-testid="interaction-${schoolName}"] [data-testid="delete-button"]`)
    await this.clickByText('Confirm Delete')
  }

  async exportInteractions(format: string) {
    await this.click('[data-testid="export-button"]')
    await this.clickByText(format)
    await this.page.waitForEvent('download')
  }
}
