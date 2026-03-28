import { test, expect } from "@playwright/test"

/**
 * Helpers para navegar ate a pagina de detalhe do paciente.
 * Vai em /patients, clica no primeiro paciente da lista.
 * Retorna false se nao ha pacientes disponiveis.
 */
async function navigateToPatientDetail(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto("/patients")

  const patientItem = page.getByTestId("patient-item").first()
  const hasPatients = await patientItem.isVisible({ timeout: 10_000 }).catch(() => false)

  if (!hasPatients) {
    return false
  }

  await patientItem.click()
  await expect(page).toHaveURL(/patients\/[^/]+$/)
  return true
}

/**
 * Abre o formulario de prescricao.
 */
async function openManualPrescriptionForm(page: import("@playwright/test").Page) {
  // Click the "Prescricao" trigger button
  await page.getByRole("button", { name: /Prescri[çc][ãa]o/ }).click()

  // Verify form is open
  const manualFormTitle = page.getByText("Nova Prescrição")
  await expect(manualFormTitle).toBeVisible({ timeout: 5_000 })
}

/**
 * Preenche os campos de um bloco de medicamento pelo indice (0-based).
 */
async function fillMedication(
  page: import("@playwright/test").Page,
  index: number,
  data: { name: string; dosage: string; frequency: string; duration: string },
) {
  // Each medication block has a header "Medicamento N"
  const block = page.locator(".rounded-xl.border").nth(index)
  await expect(block).toBeVisible()

  await block.getByPlaceholder("Ex: Amoxicilina 500mg").fill(data.name)
  await block.getByPlaceholder("Ex: 1 comprimido").fill(data.dosage)
  await block.getByPlaceholder("Ex: 8 em 8 horas").fill(data.frequency)
  await block.getByPlaceholder("Ex: 7 dias").fill(data.duration)
}

test.describe("Prescrição", () => {
  let hasPatients = false

  test.beforeEach(async ({ page }) => {
    hasPatients = await navigateToPatientDetail(page)
    if (!hasPatients) {
      test.skip()
    }
  })

  test("deve abrir dialog de prescricao na pagina do paciente", async ({ page }) => {
    const prescriptionBtn = page.getByRole("button", { name: /Prescri[çc][ãa]o/ })
    await expect(prescriptionBtn).toBeVisible()
    await prescriptionBtn.click()

    // Either the chooser ("Nova Prescricao") or the manual form ("Nova Prescrição") should appear
    const dialogVisible = await page
      .getByText(/Nova Prescri[çc][ãa]o/)
      .first()
      .isVisible({ timeout: 5_000 })
    expect(dialogVisible).toBe(true)
  })

  test("deve escolher prescricao manual", async ({ page }) => {
    await page.getByRole("button", { name: /Prescri[çc][ãa]o/ }).click()

    // If the chooser appears, click "Prescricao Manual"
    const manualBtn = page.getByRole("button", { name: /Prescricao Manual/ })
    const chooserVisible = await manualBtn.isVisible({ timeout: 3_000 }).catch(() => false)

    if (chooserVisible) {
      await manualBtn.click()
    }

    // Manual form should be visible with title "Nova Prescrição"
    await expect(page.getByText("Nova Prescrição")).toBeVisible({ timeout: 5_000 })
    // Should have the medication fields
    await expect(page.getByPlaceholder("Ex: Amoxicilina 500mg")).toBeVisible()
    await expect(page.getByPlaceholder("Ex: 1 comprimido")).toBeVisible()
    await expect(page.getByPlaceholder("Ex: 8 em 8 horas")).toBeVisible()
    await expect(page.getByPlaceholder("Ex: 7 dias")).toBeVisible()
  })

  test.fixme("deve criar prescricao com um medicamento", async ({ page, context }) => {
    await openManualPrescriptionForm(page)

    await fillMedication(page, 0, {
      name: "Amoxicilina 500mg",
      dosage: "1 comprimido",
      frequency: "8 em 8 horas",
      duration: "7 dias",
    })

    // Listen for new tab (prescription opens in new tab)
    const newPagePromise = context.waitForEvent("page")

    await page.getByRole("button", { name: /Criar e imprimir/ }).click()

    // Verify success toast
    await expect(
      page.getByText("Prescrição criada com sucesso"),
    ).toBeVisible({ timeout: 10_000 })

    // Verify new tab opened with prescription URL
    const newPage = await newPagePromise
    await expect(newPage).toHaveURL(/prescriptions\//)
  })

  test.fixme("deve adicionar multiplos medicamentos", async ({ page }) => {
    await openManualPrescriptionForm(page)

    // Fill first medication
    await fillMedication(page, 0, {
      name: "Amoxicilina 500mg",
      dosage: "1 comprimido",
      frequency: "8 em 8 horas",
      duration: "7 dias",
    })

    // Click "Adicionar medicamento"
    await page.getByRole("button", { name: /Adicionar medicamento/ }).click()

    // Fill second medication
    await fillMedication(page, 1, {
      name: "Ibuprofeno 600mg",
      dosage: "1 comprimido",
      frequency: "12 em 12 horas",
      duration: "5 dias",
    })

    // Verify 2 medication blocks exist
    await expect(page.getByText("Medicamento 1")).toBeVisible()
    await expect(page.getByText("Medicamento 2")).toBeVisible()

    // Verify both name inputs have values
    const nameInputs = page.getByPlaceholder("Ex: Amoxicilina 500mg")
    await expect(nameInputs).toHaveCount(2)
  })

  test("deve validar medicamento sem nome", async ({ page }) => {
    await openManualPrescriptionForm(page)

    // Leave all fields empty and click submit
    await page.getByRole("button", { name: /Criar e imprimir/ }).click()

    // Expect validation error toast
    await expect(
      page.getByText("Adicione pelo menos um medicamento"),
    ).toBeVisible({ timeout: 5_000 })
  })

  test.fixme("deve remover medicamento", async ({ page }) => {
    await openManualPrescriptionForm(page)

    // Fill first medication
    await fillMedication(page, 0, {
      name: "Amoxicilina 500mg",
      dosage: "1 comprimido",
      frequency: "8 em 8 horas",
      duration: "7 dias",
    })

    // Add second medication
    await page.getByRole("button", { name: /Adicionar medicamento/ }).click()
    await fillMedication(page, 1, {
      name: "Ibuprofeno 600mg",
      dosage: "1 comprimido",
      frequency: "12 em 12 horas",
      duration: "5 dias",
    })

    // Verify 2 blocks
    await expect(page.getByText("Medicamento 2")).toBeVisible()

    // Click trash icon on second medication block (the Trash2 icon button)
    const secondBlock = page.locator(".rounded-xl.border").nth(1)
    await secondBlock.getByRole("button").filter({ has: page.locator("svg") }).click()

    // Verify only 1 medication block remains
    await expect(page.getByText("Medicamento 1")).toBeVisible()
    await expect(page.getByText("Medicamento 2")).not.toBeVisible()

    // Verify only one name input remains
    await expect(page.getByPlaceholder("Ex: Amoxicilina 500mg")).toHaveCount(1)
  })
})
