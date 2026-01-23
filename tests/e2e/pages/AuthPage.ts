import { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class AuthPage extends BasePage {
  async goto() {
    await super.goto('/login')
  }

  async login(email: string, password: string) {
    await this.fillAndValidate('input[type="email"]', email)
    await this.fillAndValidate('input[type="password"]', password)
    await this.clickWhenEnabled('button:has-text("Sign In")')
    await this.waitForURL('/dashboard')
  }

  async signup(email: string, password: string, displayName: string) {
    await this.clickByText('Create one now')
    await this.waitForURL('/signup')

    const [firstName, lastName] = displayName.split(' ')
    await this.fillAndValidate('#firstName', firstName || displayName)
    if (lastName) await this.fillAndValidate('#lastName', lastName)
    await this.fillAndValidate('#email', email)
    await this.selectOption('#role', 'parent')  // Default role
    await this.fillAndValidate('#password', password)
    await this.fillAndValidate('#confirmPassword', password)

    // Check terms checkbox
    const checkbox = this.page.locator('input[type="checkbox"]')
    await checkbox.waitFor({ state: 'visible' })
    await checkbox.check()

    await this.clickWhenEnabled('button:has-text("Create Account")')
    await this.waitForURL('/dashboard')
  }

  async logout() {
    await this.click('[data-testid="profile-menu"]')
    await this.clickByText('Logout')
    await this.waitForURL('/login')
  }

  async expectLoginPage() {
    await this.expectURL('/login')
    await this.expectVisible('input[type="email"]')
  }

  async expectDashboard() {
    await this.expectURL('/dashboard')
    await this.expectVisible('h1')
  }

  async expectError(message: string) {
    await this.expectVisible('[data-testid="error-message"]')
    await this.expectText('[data-testid="error-message"]', message)
  }

  async fillInvalidEmail(email: string) {
    await this.fillInput('input[type="email"]', email)
    await this.clickByText('Sign In')
  }

  async fillWeakPassword(password: string) {
    await this.fillInput('input[type="password"]', password)
  }
}
