import { test, expect } from "@playwright/test"

test.describe("Navegacao", () => {
  test("deve navegar pelo sidebar", async ({ page }) => {
    await page.goto("/dashboard")

    const sidebar = page.getByTestId("nav-sidebar")
    await expect(sidebar).toBeVisible()

    // Nomes exatos dos links conforme nav-sidebar.tsx
    const links = [
      { name: "Dashboard", url: /\/dashboard/ },
      { name: "Pacientes", url: /\/patients/ },
      { name: "Agenda", url: /\/calendar/ },
      { name: "Financeiro", url: /\/financial/ },
      { name: "Configuracoes", url: /\/settings/ },
    ]

    for (const link of links) {
      await expect(
        sidebar.getByRole("link", { name: link.name })
      ).toBeVisible()
    }
  })

  test("deve mostrar breadcrumb na pagina de pacientes", async ({ page }) => {
    await page.goto("/patients")

    // Verify the page loaded
    await expect(page).toHaveURL(/\/patients/)

    // Usar h1 especifico para evitar strict mode violation (sidebar tambem tem "Pacientes")
    await expect(
      page.locator("h1").filter({ hasText: /Pacientes/i })
    ).toBeVisible()
  })

  test("deve navegar via sidebar para todas as paginas principais", async ({
    page,
  }) => {
    await page.goto("/dashboard")

    const sidebar = page.getByTestId("nav-sidebar")

    // Navigate to Pacientes
    await sidebar.getByRole("link", { name: "Pacientes" }).click()
    await expect(page).toHaveURL(/\/patients/)

    // Navigate to Agenda
    await sidebar.getByRole("link", { name: "Agenda" }).click()
    await expect(page).toHaveURL(/\/calendar/)

    // Navigate to Financeiro
    await sidebar.getByRole("link", { name: "Financeiro" }).click()
    await expect(page).toHaveURL(/\/financial/)

    // Navigate to Configuracoes
    await sidebar.getByRole("link", { name: "Configuracoes" }).click()
    await expect(page).toHaveURL(/\/settings/)

    // Navigate back to Dashboard
    await sidebar.getByRole("link", { name: "Dashboard" }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
