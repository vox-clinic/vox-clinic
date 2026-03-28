import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test("deve carregar dashboard completo", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByTestId("page-dashboard")).toBeVisible()
    await expect(page.getByTestId("section-stats")).toBeVisible()
    await expect(page.getByTestId("section-quick-actions")).toBeVisible()

    // Appointments section: either upcoming list or empty state
    const upcomingAppointments = page.getByTestId(
      "section-upcoming-appointments"
    )
    const emptyAppointments = page.getByTestId("empty-today-appointments")
    await expect(
      upcomingAppointments.or(emptyAppointments).first()
    ).toBeVisible()
  })

  test("deve mostrar consultas de hoje", async ({ page }) => {
    await page.goto("/dashboard")

    // Either there are upcoming appointments or the empty state is shown
    const upcomingAppointments = page.getByTestId(
      "section-upcoming-appointments"
    )
    const emptyAppointments = page.getByTestId("empty-today-appointments")

    await expect(
      upcomingAppointments.or(emptyAppointments).first()
    ).toBeVisible()
  })

  test("deve navegar para nova consulta", async ({ page }) => {
    await page.goto("/dashboard")

    // Wait for dashboard to fully load (not skeleton)
    await expect(page.getByTestId("section-quick-actions")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("page-dashboard").getByRole("link", { name: /Nova Consulta/i }).first().click()

    await expect(page).toHaveURL(/\/(appointments\/new|calendar)/)
  })

  test("deve navegar para calendario", async ({ page }) => {
    await page.goto("/dashboard")

    // Wait for dashboard to fully load
    await expect(page.getByTestId("section-quick-actions")).toBeVisible({ timeout: 15_000 })
    await page.getByRole("link", { name: /Agendar Consulta/i }).first().click()

    await expect(page).toHaveURL(/\/calendar/)
  })
})
