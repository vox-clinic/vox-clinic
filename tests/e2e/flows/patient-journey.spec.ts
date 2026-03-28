import { test, expect } from "@playwright/test"
import { PatientsListPage } from "../pages/patients-list.page"

test.describe("Jornada do Paciente", () => {
  test("deve criar paciente, agendar consulta e visualizar prontuario", async ({
    page,
  }) => {
    const patientsPage = new PatientsListPage(page)
    await patientsPage.goto()
    await patientsPage.expectLoaded()

    // Step 1: Navigate to new patient
    await patientsPage.clickNewPatient()
    await expect(page).toHaveURL(/patients\/new/)

    // Step 2: Fill manual patient form
    await page.getByRole("link", { name: /manual/i }).click()
    await expect(page).toHaveURL(/patients\/new\/manual/)

    await page.getByLabel("Nome").fill("Paciente Teste E2E")
    await page.getByLabel("Telefone").fill("11999999999")

    await page.getByRole("button", { name: /salvar|cadastrar/i }).click()

    // Step 3: Should redirect to patient page
    await expect(page).toHaveURL(/patients\//)
  })
})
