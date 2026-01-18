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

  async click(selector: string) {
    await this.page.click(selector)
  }

  async clickByText(text: string) {
    await this.page.click(`text=${text}`)
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
}
