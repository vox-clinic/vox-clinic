import { Page, expect } from "@playwright/test"
import { BasePage } from "./base.page"

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.navigateTo("/dashboard")
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/dashboard/)
    await expect(this.page.getByTestId("page-dashboard")).toBeVisible()
  }

  async searchGlobal(query: string) {
    await this.page.getByTestId("global-search").fill(query)
  }
}
