import { test, expect } from "@playwright/test"

test.describe("Layout Responsivo (Mobile)", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test("deve exibir nav bottom no mobile", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByTestId("nav-bottom")).toBeVisible()
  })

  test("deve esconder sidebar no mobile", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByTestId("nav-sidebar")).not.toBeVisible()
  })

  test("deve carregar dashboard no mobile", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByTestId("page-dashboard")).toBeVisible()
    await expect(page.getByTestId("section-stats")).toBeVisible()
  })

  test("deve navegar para pacientes no mobile", async ({ page }) => {
    await page.goto("/dashboard")

    // Use bottom nav to go to patients
    await page.getByTestId("nav-bottom").getByRole("link", { name: /Pacientes/i }).click()

    await expect(page).toHaveURL(/\/patients/)
  })

  test("deve buscar paciente no mobile", async ({ page }) => {
    await page.goto("/patients")

    // The search input has aria-label="Buscar paciente" and
    // placeholder="Buscar por nome, CPF, telefone, email, convenio..."
    // Use data-testid which is always present regardless of viewport
    const searchInput = page.getByTestId("input-patient-search")
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    await searchInput.fill("Teste")
    // Verify the input accepted the value
    await expect(searchInput).toHaveValue("Teste")
  })

  test("deve carregar calendario no mobile", async ({ page }) => {
    await page.goto("/calendar")

    await expect(page.getByTestId("page-calendar")).toBeVisible()
  })

  test("deve abrir formulario de paciente no mobile", async ({ page }) => {
    await page.goto("/patients/new/manual")

    // Verify form loads and is usable on small viewport
    // Use the input ids instead of labels for reliability
    const nameInput = page.locator("#name")
    const phoneInput = page.locator("#phone")
    await expect(nameInput).toBeVisible({ timeout: 10_000 })
    await expect(phoneInput).toBeVisible()

    // Verify form is interactive
    await nameInput.fill("Paciente Mobile")
    await expect(nameInput).toHaveValue("Paciente Mobile")
  })
})
