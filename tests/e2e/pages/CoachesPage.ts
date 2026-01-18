import { BasePage } from './BasePage'

export class CoachesPage extends BasePage {
  async goto(schoolId?: string) {
    if (schoolId) {
      await super.goto(`/schools/${schoolId}/coaches`)
    } else {
      await super.goto('/coaches')
    }
  }

  async navigateToCoaches() {
    await this.click('[data-testid="nav-coaches"]')
    await this.waitForURL(/coaches/)
  }

  async clickAddCoach() {
    await this.clickByText('Add Coach')
    await this.waitForURL(/\/.*\/coaches\/new/)
  }

  async createCoach(coach: any) {
    await this.fillInput('input[placeholder*="first name"]', coach.firstName)
    await this.fillInput('input[placeholder*="last name"]', coach.lastName)
    await this.selectOption('[data-testid="role-select"]', coach.role)
    await this.fillInput('input[placeholder*="email"]', coach.email)
    await this.fillInput('input[placeholder*="phone"]', coach.phone)

    await this.clickByText('Add Coach')
    await this.page.waitForLoadState('networkidle')
  }

  async updateCoach(updates: any) {
    if (updates.firstName) {
      await this.fillInput('input[placeholder*="first name"]', updates.firstName)
    }
    if (updates.phone) {
      await this.fillInput('input[placeholder*="phone"]', updates.phone)
    }

    await this.clickByText('Save Changes')
  }

  async deleteCoach(coachName: string) {
    await this.click(`[data-testid="coach-${coachName}"] [data-testid="delete-button"]`)
    await this.clickByText('Confirm Delete')
  }

  async expectCoachInList(firstName: string, lastName: string) {
    await this.expectVisible(`text=${firstName} ${lastName}`)
  }

  async viewCoachDetails(coachName: string) {
    await this.clickByText(coachName)
    await this.page.waitForLoadState('networkidle')
  }

  async getCoachResponsiveness() {
    return await this.getText('[data-testid="responsiveness-score"]')
  }

  async getLastContactDate() {
    return await this.getText('[data-testid="last-contact-date"]')
  }

  async getCoachCount(): Promise<number> {
    return await this.getCount('[data-testid="coach-card"]')
  }

  async viewCoachAnalytics() {
    await this.click('[data-testid="analytics-tab"]')
    await this.expectVisible('[data-testid="responsiveness-chart"]')
  }
}
