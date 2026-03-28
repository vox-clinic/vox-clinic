import { Page, Locator, expect } from "@playwright/test"

export class BasePage {
  readonly page: Page
  readonly navBar: Locator
  readonly toastSuccess: Locator
  readonly toastError: Locator

  constructor(page: Page) {
    this.page = page
    this.navBar = page.getByTestId("nav-bar")
    this.toastSuccess = page.getByTestId("toast-success")
    this.toastError = page.getByTestId("toast-error")
  }

  async navigateTo(path: string) {
    await this.page.goto(path)
  }

  async expectToastSuccess(message?: string) {
    await expect(this.toastSuccess).toBeVisible()
    if (message) {
      await expect(this.toastSuccess).toContainText(message)
    }
  }

  async expectToastError(message?: string) {
    await expect(this.toastError).toBeVisible()
    if (message) {
      await expect(this.toastError).toContainText(message)
    }
  }

  async waitForLoading() {
    // Wait a tick for any loading indicator to potentially appear
    await this.page.waitForTimeout(200)
    const loading = this.page.locator("[data-testid^='loading-']")
    // If a loading indicator is visible, wait for it to disappear
    const isVisible = await loading.isVisible().catch(() => false)
    if (isVisible) {
      await loading.waitFor({ state: "hidden", timeout: 15_000 })
    }
  }
}
