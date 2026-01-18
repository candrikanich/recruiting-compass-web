import { BasePage } from './BasePage'

export class OffersPage extends BasePage {
  async goto() {
    await super.goto('/offers')
  }

  async navigateToOffers() {
    await this.click('[data-testid="nav-offers"]')
    await this.waitForURL('/offers')
  }

  async clickCreateOffer() {
    await this.clickByText('Create Offer')
    await this.waitForURL(/offers\/new/)
  }

  async createOffer(offer: any) {
    // Select school
    await this.click('[data-testid="school-select"]')
    await this.clickByText(offer.school)

    // Select offer type
    await this.selectOption('[data-testid="offer-type-select"]', offer.type)

    // Fill scholarship info
    await this.fillInput('[data-testid="scholarship-amount-input"]', offer.scholarshipAmount.toString())
    await this.fillInput('[data-testid="scholarship-percentage-input"]', offer.scholarshipPercentage.toString())

    // Fill conditions
    if (offer.conditions) {
      await this.fillInput('[placeholder*="conditions"]', offer.conditions)
    }

    // Set deadline
    if (offer.deadline) {
      await this.click('[data-testid="deadline-picker"]')
      const deadlineDate = new Date()
      deadlineDate.setDate(deadlineDate.getDate() + offer.deadline)
      await this.fillInput('[data-testid="deadline-input"]', deadlineDate.toISOString().split('T')[0])
    }

    await this.clickByText('Create Offer')
    await this.page.waitForLoadState('networkidle')
  }

  async acceptOffer(schoolName: string) {
    await this.click(`[data-testid="offer-${schoolName}"] [data-testid="accept-button"]`)
    await this.clickByText('Confirm Accept')
  }

  async declineOffer(schoolName: string) {
    await this.click(`[data-testid="offer-${schoolName}"] [data-testid="decline-button"]`)
    await this.clickByText('Confirm Decline')
  }

  async expectOfferStatus(schoolName: string, status: string) {
    await this.expectVisible(`[data-testid="offer-${schoolName}-status"]:has-text("${status}")`)
  }

  async filterByStatus(status: string) {
    await this.click('[data-testid="filter-button"]')
    await this.selectOption('[data-testid="status-filter"]', status)
  }

  async filterByDeadline() {
    await this.click('[data-testid="filter-button"]')
    await this.clickByText('Urgent Deadlines')
  }

  async sortByDeadline() {
    await this.click('[data-testid="sort-button"]')
    await this.clickByText('By Deadline')
  }

  async compareOffers() {
    await this.click('[data-testid="compare-button"]')
    await this.waitForURL('/offers/compare')
  }

  async getOfferCount(): Promise<number> {
    return await this.getCount('[data-testid="offer-card"]')
  }

  async getUrgentOfferCount(): Promise<number> {
    return await this.getCount('[data-testid="offer-urgent"]')
  }

  async viewOfferDetails(schoolName: string) {
    await this.click(`text=${schoolName}`)
    await this.page.waitForLoadState('networkidle')
  }

  async updateOffer(schoolName: string, updates: any) {
    if (updates.scholarshipAmount) {
      await this.fillInput('[data-testid="scholarship-amount-input"]', updates.scholarshipAmount.toString())
    }
    if (updates.conditions) {
      await this.fillInput('[placeholder*="conditions"]', updates.conditions)
    }

    await this.clickByText('Save Changes')
  }

  async deleteOffer(schoolName: string) {
    await this.click(`[data-testid="offer-${schoolName}"] [data-testid="delete-button"]`)
    await this.clickByText('Confirm Delete')
  }
}
