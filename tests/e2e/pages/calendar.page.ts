import { Page, expect } from "@playwright/test"
import { BasePage } from "./base.page"

export class CalendarPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.navigateTo("/calendar")
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/calendar/)
    await expect(this.page.getByTestId("page-calendar")).toBeVisible({ timeout: 15_000 })
    // Wait for loading spinner to disappear
    const loading = this.page.getByTestId("loading-calendar")
    if (await loading.isVisible().catch(() => false)) {
      await loading.waitFor({ state: "hidden", timeout: 30_000 })
    }
  }

  async clickSchedule() {
    // Button text "Agendar" is hidden on mobile (hidden sm:inline), but the button
    // still has text content. Use a broader locator that matches the Plus icon button.
    await this.page.getByRole("button", { name: /Agendar/i }).click()
  }

  async clickBlockTime() {
    await this.page.getByRole("button", { name: /Bloquear/i }).click()
  }

  async clickWaitlist() {
    await this.page.getByRole("button", { name: /Espera/i }).click()
  }

  async navigateNext() {
    await this.page
      .locator("button")
      .filter({ has: this.page.locator("svg.lucide-chevron-right") })
      .click()
  }

  async navigatePrev() {
    await this.page
      .locator("button")
      .filter({ has: this.page.locator("svg.lucide-chevron-left") })
      .click()
  }

  async clickToday() {
    await this.page.getByRole("button", { name: "Hoje" }).click()
  }

  /** Switch to day view. The label "Dia" is inside a span with `hidden sm:inline`,
   *  so on mobile it's not accessible by text. We match by the Sun icon or text. */
  async switchToDayView() {
    // On desktop the button text includes "Dia"; on mobile only the icon is shown.
    // Use locator that finds button containing the Sun icon (lucide-sun).
    const btn = this.page.getByRole("button", { name: /Dia/i })
    const visible = await btn.isVisible().catch(() => false)
    if (visible) {
      await btn.click()
    } else {
      // Mobile: find button with Sun icon inside the view switcher
      await this.page.locator("button").filter({ has: this.page.locator("svg.lucide-sun") }).click()
    }
  }

  async switchToWeekView() {
    const btn = this.page.getByRole("button", { name: /Semana/i })
    const visible = await btn.isVisible().catch(() => false)
    if (visible) {
      await btn.click()
    } else {
      await this.page.locator("button").filter({ has: this.page.locator("svg.lucide-calendar") }).first().click()
    }
  }

  async switchToMonthView() {
    const btn = this.page.getByRole("button", { name: /Mes/i })
    const visible = await btn.isVisible().catch(() => false)
    if (visible) {
      await btn.click()
    } else {
      await this.page.locator("button").filter({ has: this.page.locator("svg.lucide-calendar-days") }).click()
    }
  }

  async switchToListView() {
    const btn = this.page.getByRole("button", { name: /Lista/i })
    const visible = await btn.isVisible().catch(() => false)
    if (visible) {
      await btn.click()
    } else {
      await this.page.locator("button").filter({ has: this.page.locator("svg.lucide-list") }).click()
    }
  }

  getTitle() {
    return this.page.locator("h1")
  }
}
