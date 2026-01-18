import { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class AuthPage extends BasePage {
  async goto() {
    await super.goto('/login')
  }

  async login(email: string, password: string) {
    await this.fillInput('input[type="email"]', email)
    await this.fillInput('input[type="password"]', password)
    await this.clickByText('Login')
    await this.waitForURL('/dashboard')
  }

  async signup(email: string, password: string, displayName: string) {
    await this.clickByText('Sign up')
    await this.waitForURL('/signup')

    await this.fillInput('input[placeholder*="email"]', email)
    await this.fillInput('input[placeholder*="name"]', displayName)
    await this.fillInput('input[type="password"]', password)
    await this.fillInput('input[placeholder*="confirm"]', password)

    await this.clickByText('Create Account')
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
    await this.clickByText('Login')
  }

  async fillWeakPassword(password: string) {
    await this.fillInput('input[type="password"]', password)
  }
}
