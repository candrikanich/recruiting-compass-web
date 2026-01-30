import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AuthPage extends BasePage {
  async goto() {
    await super.goto("/login");
    // Wait a moment for any redirects to complete
    await this.page.waitForTimeout(1000);
  }

  async login(email: string, password: string) {
    await this.fillAndValidate('input[type="email"]', email);
    await this.fillAndValidate('input[type="password"]', password);

    // Wait for button to be enabled and click it
    await this.waitForElementEnabled('[data-testid="login-button"]');
    await this.click('[data-testid="login-button"]');

    // Wait for navigation with longer timeout
    await this.page.waitForURL("/dashboard", { timeout: 15000 });
  }

  async signup(email: string, password: string, displayName: string) {
    // Click signup link - use more specific selector
    await this.click('a[href="/signup"]');
    await this.waitForURL("/signup");

    const [firstName, lastName] = displayName.split(" ");

    // Wait for form to be ready and fill all fields
    await this.waitForElement("#firstName");
    await this.fillAndValidate("#firstName", firstName || displayName);

    if (lastName) {
      await this.fillAndValidate("#lastName", lastName);
    }

    await this.fillAndValidate("#email", email);
    await this.selectOption("#role", "parent"); // Default role
    await this.fillAndValidate("#password", password);

    // Make sure confirm password field is ready before filling
    await this.waitForElement("#confirmPassword");
    await this.fillAndValidate("#confirmPassword", password);

    // Check terms checkbox
    const checkbox = this.page.locator('input[type="checkbox"]');
    await checkbox.waitFor({ state: "visible" });
    await checkbox.check();

    // Wait for button to be enabled and click it
    await this.waitForElementEnabled('[data-testid="signup-button"]');
    await this.click('[data-testid="signup-button"]');

    // Wait for navigation to verify-email page (email verification flow)
    await this.page.waitForURL(/\/verify-email/, { timeout: 15000 });
  }

  async logout() {
    // Try to find profile menu and logout
    try {
      await this.waitForElement('[data-testid="profile-menu"]', 5000);
      await this.click('[data-testid="profile-menu"]');
      await this.click('[data-testid="logout-button"]');
    } catch {
      // Alternative logout - clear auth state manually
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await this.page.context().clearCookies();
      await this.goto();
    }
    await this.waitForURL("/login");
  }

  async expectLoginPage() {
    await this.expectURL("/login");
    await this.expectVisible('input[type="email"]');
  }

  async expectDashboard() {
    await this.expectURL("/dashboard");
    await this.expectVisible("h1");
  }

  async expectVerifyEmail() {
    await this.expectURL(/\/verify-email/);
    // Check for verify email page header
    const header = this.page.locator("h1:has-text('Verify Your Email')");
    await header.waitFor({ state: "visible", timeout: 5000 });
  }

  async expectError(message: string) {
    await this.expectVisible('[data-testid="error-message"]');
    await this.expectText('[data-testid="error-message"]', message);
  }

  async fillInvalidEmail(email: string) {
    await this.fillAndValidate('input[type="email"]', email);
    // Try to click button but expect it to be disabled
    try {
      await this.click('button[type="submit"]', 5000);
    } catch {
      // Button should be disabled due to validation
    }
  }

  async fillWeakPassword(password: string) {
    await this.fillAndValidate('input[type="password"]', password);
  }
}
