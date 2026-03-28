import { Page, expect } from "@playwright/test"
import { BasePage } from "./base.page"

export class PatientFormPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.navigateTo("/patients/new/manual")
    await expect(this.page.locator("#name")).toBeVisible()
  }

  async fillName(name: string) {
    await this.page.locator("#name").fill(name)
  }

  async fillPhone(phone: string) {
    await this.page.locator("#phone").fill(phone)
  }

  async fillEmail(email: string) {
    await this.page.locator("#email").fill(email)
  }

  async fillDocument(cpf: string) {
    await this.page.locator("#document").fill(cpf)
  }

  async fillBirthDate(date: string) {
    await this.page.locator("#birthDateDisplay").fill(date)
  }

  async selectGender(value: string) {
    await this.page.locator("#gender").selectOption(value)
  }

  async fillInsurance(value: string) {
    await this.page.locator("#insurance").fill(value)
  }

  async submit() {
    await this.page.getByRole("button", { name: "Cadastrar Paciente" }).click()
  }

  async cancel() {
    await this.page.getByRole("button", { name: "Cancelar" }).click()
  }

  async expectCPFError(message?: string) {
    const errorEl = this.page.locator("#document ~ p.text-vox-error")
    await expect(errorEl).toBeVisible()
    if (message) {
      await expect(errorEl).toContainText(message)
    }
  }

  async expectPhoneError(message?: string) {
    const errorEl = this.page.locator("#phone ~ p.text-vox-error")
    await expect(errorEl).toBeVisible()
    if (message) {
      await expect(errorEl).toContainText(message)
    }
  }

  async expectSubmitDisabled() {
    await expect(
      this.page.getByRole("button", { name: "Cadastrar Paciente" })
    ).toBeDisabled()
  }
}
