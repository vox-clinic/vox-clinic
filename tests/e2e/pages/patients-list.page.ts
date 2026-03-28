import { Page, expect } from "@playwright/test"
import { BasePage } from "./base.page"

export class PatientsListPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.navigateTo("/patients")
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/patients/)
  }

  async searchPatient(query: string) {
    // Use data-testid for reliability — placeholder is long and may change
    await this.page.getByTestId("input-patient-search").fill(query)
  }

  async clickNewPatient() {
    await this.page.getByRole("link", { name: /novo paciente/i }).click()
  }

  async getPatientCount() {
    return this.page.getByTestId("patient-item").count()
  }
}
