import { Page, expect } from '@playwright/test'

export class BasePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(path: string) {
    await this.page.goto(path)
  }

  async waitForURL(url: string | RegExp) {
    await this.page.waitForURL(url)
  }

  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value)
  }

  async click(selector: string, timeout = 10000) {
    await this.page.locator(selector).click({ timeout })
  }

  async clickByText(text: string, timeout = 10000) {
    await this.page.locator(`text=${text}`).click({ timeout })
  }

  async selectOption(selector: string, value: string) {
    await this.page.selectOption(selector, value)
  }

  async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || ''
  }

  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector)
  }

  async waitForElement(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout })
  }

  async getURL(): Promise<string> {
    return this.page.url()
  }

  async expectURL(url: string | RegExp) {
    await expect(this.page).toHaveURL(url)
  }

  async expectVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible()
  }

  async expectHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden()
  }

  async expectText(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text)
  }

  async expectNotText(selector: string, text: string) {
    await expect(this.page.locator(selector)).not.toContainText(text)
  }

  async getCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count()
  }

  async reloadPage() {
    await this.page.reload()
  }

  async goBack() {
    await this.page.goBack()
  }

  async pause() {
    await this.page.pause()
  }

  async waitForElementEnabled(selector: string, timeout = 10000) {
    await this.page.locator(selector).waitFor({ state: 'visible', timeout })
    const element = this.page.locator(selector)
    await element.evaluate((el: HTMLElement) => {
      return new Promise<void>((resolve) => {
        const checkEnabled = () => {
          const isDisabled = (el as any).disabled || el.getAttribute('disabled') !== null
          if (!isDisabled) {
            resolve()
          } else {
            setTimeout(checkEnabled, 100)
          }
        }
        checkEnabled()
      })
    })
  }

  async clickWhenEnabled(selector: string) {
    await this.waitForElementEnabled(selector)
    await this.click(selector)
  }

  async fillAndValidate(selector: string, value: string) {
    const locator = this.page.locator(selector)
    await locator.waitFor({ state: 'visible' })
    await locator.fill(value)
    await locator.blur()  // Trigger validation
    await this.page.waitForTimeout(100)  // Brief wait for validation feedback
  }
}
