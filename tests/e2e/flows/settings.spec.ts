import { test, expect } from "@playwright/test"

test.describe("Configuracoes", () => {
  test("deve carregar pagina de configuracoes", async ({ page }) => {
    await page.goto("/settings")

    // Wait for loading skeleton to disappear and content to render
    // The hero card shows clinic name or "Minha Clinica" as h1, and subtitle below
    await expect(
      page.getByText("Gerencie seu workspace", { exact: false })
    ).toBeVisible({ timeout: 15_000 })
  })

  test("deve mostrar todas as tabs", async ({ page }) => {
    await page.goto("/settings")

    // Wait for page to load — the subtitle is always visible after loading
    await expect(page.getByText("Gerencie seu workspace")).toBeVisible({
      timeout: 15_000,
    })

    // Settings uses @base-ui/react Tabs which render role="tab" for TabsTrigger.
    // TISS and Auditoria are plain <Link> elements, not tabs.
    const expectedTabs = [
      "Clínica",
      "Procedimentos",
      "Campos",
      "Formularios",
      "Equipe",
      "Agendas",
      "Online",
      "Mensagens",
      "Aparencia",
      "Comissoes",
      "Pagamento",
      "Fiscal",
      "Plano",
    ]

    for (const tabName of expectedTabs) {
      await expect(
        page.getByRole("tab", { name: tabName })
      ).toBeAttached()
    }

    // TISS and Auditoria are links, not tabs
    await expect(
      page.getByRole("link", { name: "TISS" })
    ).toBeAttached()
  })

  test("deve navegar entre tabs", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.getByText("Gerencie seu workspace")).toBeVisible({
      timeout: 15_000,
    })

    // Clinica tab is default — verify its content is visible
    await expect(page.getByText("Dados da Clinica")).toBeVisible({ timeout: 10_000 })

    // Click Procedimentos tab
    await page.getByRole("tab", { name: "Procedimentos" }).click()
    await page.waitForTimeout(500)

    // Click Equipe tab
    await page.getByRole("tab", { name: "Equipe" }).click()
    await page.waitForTimeout(500)

    // Click back to Clinica
    await page.getByRole("tab", { name: /Cl.nica/i }).click()
    await expect(page.getByText("Dados da Clinica")).toBeVisible({ timeout: 10_000 })
  })

  test("deve editar nome da clinica", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.getByText("Gerencie seu workspace")).toBeVisible({
      timeout: 15_000,
    })

    // Clinica tab is default — find the clinic name input by placeholder
    const clinicInput = page.getByPlaceholder("Ex: Clinica Sorriso")
    await expect(clinicInput).toBeVisible()

    // Modify the value to trigger hasChanges
    const currentValue = await clinicInput.inputValue()
    const newValue = currentValue === "Clinica Teste E2E" ? "Clinica E2E Teste" : "Clinica Teste E2E"
    await clinicInput.fill(newValue)

    // The save button appears in the hero card (desktop) or sticky bar (mobile)
    // On desktop, the hero save button should be enabled when hasChanges is true
    const saveButton = page.getByRole("button", { name: /Salvar/i }).first()
    await expect(saveButton).toBeEnabled({ timeout: 5_000 })
    await saveButton.click()

    // Verify saved feedback — button changes to "Salvo!" or toast appears
    await expect(
      page.getByRole("button", { name: /Salvo!/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test("deve gerenciar equipe", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.getByText("Gerencie seu workspace")).toBeVisible({
      timeout: 15_000,
    })

    // Click Equipe tab
    await page.getByRole("tab", { name: "Equipe" }).click()

    // Verify team section loaded — look for invite form or member list
    await expect(
      page
        .getByText(/convid|membro|equipe/i)
        .first()
    ).toBeVisible({ timeout: 10_000 })
  })
})
