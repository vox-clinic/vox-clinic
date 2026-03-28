import { test, expect } from "@playwright/test"

test.describe("Login e acesso ao Dashboard", () => {
  // Clerk em modo dev pode nao bloquear requests nao autenticados na primeira carga.
  // Este teste so funciona de forma confiavel em producao/CI com Clerk configurado.
  test.skip("deve redirecionar para sign-in quando nao autenticado", async ({
    browser,
  }) => {
    // Create a fresh context without stored auth
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto("/dashboard")
    await expect(page).toHaveURL(/sign-in/)

    await context.close()
  })

  test("deve acessar dashboard apos autenticacao", async ({ page }) => {
    // Auth state is pre-loaded via storageState in playwright.config.ts
    await page.goto("/dashboard")

    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByTestId("page-dashboard")).toBeVisible()
  })

  test("deve mostrar estatisticas no dashboard", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByTestId("section-stats")).toBeVisible()
  })

  test("deve mostrar acoes rapidas", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByTestId("section-quick-actions")).toBeVisible()
  })

  test("deve navegar para pacientes via quick action", async ({ page }) => {
    await page.goto("/dashboard")

    // Wait for quick actions to render
    await expect(page.getByTestId("section-quick-actions")).toBeVisible()

    await page.getByRole("link", { name: /Novo Paciente/i }).click()

    await expect(page).toHaveURL(/\/patients\/new/)
  })

  test("deve navegar para agendamento via quick action", async ({ page }) => {
    await page.goto("/dashboard")

    // Wait for quick actions to render
    await expect(page.getByTestId("section-quick-actions")).toBeVisible()

    // The "Agendar Consulta" quick action has aria-label="Agendar Consulta" and href="/calendar"
    await page.getByRole("link", { name: /Agendar Consulta/i }).click()

    await expect(page).toHaveURL(/\/calendar/)
  })
})
