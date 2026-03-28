import { test, expect } from "@playwright/test"
import { CalendarPage } from "../pages/calendar.page"

test.describe("Calendario e Agendamento", () => {
  let calendar: CalendarPage

  test.beforeEach(async ({ page }) => {
    calendar = new CalendarPage(page)
    await calendar.goto()
    await calendar.expectLoaded()
    // Wait for loading spinner to disappear (if visible)
    await calendar.waitForLoading()
  })

  test("deve carregar pagina do calendario", async () => {
    await calendar.expectLoaded()
    await expect(calendar.getTitle()).toBeVisible()
  })

  test("deve alternar entre visualizacoes", async ({ page }) => {
    await calendar.switchToDayView()
    await calendar.waitForLoading()
    await expect(calendar.getTitle()).toBeVisible()

    await calendar.switchToWeekView()
    await calendar.waitForLoading()
    await expect(calendar.getTitle()).toBeVisible()

    await calendar.switchToMonthView()
    await calendar.waitForLoading()
    // Month view title contains year
    await expect(calendar.getTitle()).toContainText(/\d{4}/)

    await calendar.switchToListView()
    await calendar.waitForLoading()
    // List view title same format as month
    await expect(calendar.getTitle()).toContainText(/\d{4}/)
  })

  test("deve navegar entre datas", async () => {
    const initialTitle = await calendar.getTitle().textContent()

    await calendar.navigateNext()
    await calendar.waitForLoading()
    const afterNext = await calendar.getTitle().textContent()
    expect(afterNext).not.toBe(initialTitle)

    await calendar.navigatePrev()
    await calendar.waitForLoading()
    const afterPrev = await calendar.getTitle().textContent()
    expect(afterPrev).toBe(initialTitle)
  })

  test("deve voltar para hoje", async () => {
    const initialTitle = await calendar.getTitle().textContent()

    // Navigate away twice to ensure we are far from today
    await calendar.navigateNext()
    await calendar.waitForLoading()
    await calendar.navigateNext()
    await calendar.waitForLoading()

    const awayTitle = await calendar.getTitle().textContent()
    expect(awayTitle).not.toBe(initialTitle)

    await calendar.clickToday()
    await calendar.waitForLoading()

    const afterToday = await calendar.getTitle().textContent()
    expect(afterToday).toBe(initialTitle)
  })

  test("deve abrir formulario de agendamento", async ({ page }) => {
    await calendar.clickSchedule()

    // The heading is an h2, not h1
    await expect(
      page.getByRole("heading", { name: /Agendar Nova Consulta/i })
    ).toBeVisible({ timeout: 5_000 })
    await expect(
      page.getByPlaceholder("Buscar paciente por nome...")
    ).toBeVisible()
  })

  test("deve buscar paciente no formulario de agendamento", async ({
    page,
  }) => {
    await calendar.clickSchedule()

    // The search input placeholder may vary
    const searchInput = page.getByPlaceholder("Buscar paciente por nome...")
    await expect(searchInput).toBeVisible({ timeout: 5_000 })
    await searchInput.fill("Paciente")

    // Wait for debounced search results — skip if no patients exist
    const patientResult = page.locator("button").filter({ hasText: /Paciente/i }).first()
    const hasResults = await patientResult.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasResults) {
      // Sem pacientes cadastrados — skip gracefully
      test.skip()
      return
    }

    await expect(patientResult).toBeVisible()
  })

  test("deve agendar consulta presencial", async ({ page }) => {
    await calendar.clickSchedule()

    // Search and select patient
    const searchInput = page.getByPlaceholder("Buscar paciente por nome...")
    await expect(searchInput).toBeVisible({ timeout: 5_000 })
    await searchInput.fill("Paciente")

    const patientResult = page.locator("button").filter({ hasText: /Paciente/i }).first()
    const hasResults = await patientResult.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasResults) {
      // Sem pacientes cadastrados — nao e possivel agendar
      test.skip()
      return
    }

    await patientResult.click()

    // Select Presencial type (default, but click to be explicit)
    const presencialBtn = page.getByRole("button", { name: "Presencial" })
    const hasTypeSelector = await presencialBtn.isVisible({ timeout: 2_000 }).catch(() => false)
    if (hasTypeSelector) {
      await presencialBtn.click()
    }

    // Pick a date — set tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split("T")[0]
    const dateInput = page.locator('input[type="date"]')
    const hasDateInput = await dateInput.isVisible({ timeout: 2_000 }).catch(() => false)
    if (hasDateInput) {
      await dateInput.fill(dateStr)
    }

    // Pick a time slot (09:00)
    const timeSlot = page.getByRole("button", { name: "09:00", exact: true })
    const hasTimeSlot = await timeSlot.isVisible({ timeout: 2_000 }).catch(() => false)
    if (hasTimeSlot) {
      await timeSlot.click()
    }

    // Submit the form
    await page.getByRole("button", { name: "Agendar", exact: true }).click()

    // Expect success toast
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test("deve abrir formulario de bloqueio de horario", async ({ page }) => {
    await calendar.clickBlockTime()

    // The heading is an h2 with text "Bloquear Horario" (with accent on a)
    await expect(
      page.getByRole("heading", { name: /Bloquear Hor/i })
    ).toBeVisible({ timeout: 5_000 })
  })

  test("deve cancelar agendamento via popover", async ({ page }) => {
    // Switch to day view for easier appointment targeting
    await calendar.switchToDayView()
    await calendar.waitForLoading()

    // Find an existing appointment and click it
    const appointment = page
      .locator("[data-testid^='appointment-']")
      .first()

    // Skip if no appointments exist
    if ((await appointment.count()) === 0) {
      test.skip()
      return
    }

    await appointment.click()

    // Click "Cancelar" status button in the popover
    const cancelButton = page.getByRole("button", { name: "Cancelar" }).last()
    await cancelButton.click()

    // Verify success toast
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test("deve concluir consulta via popover", async ({ page }) => {
    // Switch to day view for easier appointment targeting
    await calendar.switchToDayView()
    await calendar.waitForLoading()

    // Find an existing appointment and click it
    const appointment = page
      .locator("[data-testid^='appointment-']")
      .first()

    // Skip if no appointments exist
    if ((await appointment.count()) === 0) {
      test.skip()
      return
    }

    await appointment.click()

    // Click "Concluir" status button in the popover
    const concludeButton = page.getByRole("button", { name: "Concluir" })
    await concludeButton.click()

    // Verify success toast
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible({
      timeout: 10_000,
    })
  })
})
