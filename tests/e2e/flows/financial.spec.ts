import { test, expect } from "@playwright/test"

test.describe("Financeiro", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/financial")
    // Aguardar carregamento inicial — skeleton desaparece quando loading=false
    // Os cards de resumo so aparecem apos o fetch terminar
    await page.locator("h1").filter({ hasText: /Financeiro/i }).waitFor({ timeout: 15_000 })
  })

  test("deve carregar pagina financeira", async ({ page }) => {
    await expect(
      page.locator("h1").filter({ hasText: /Financeiro/i })
    ).toBeVisible()
  })

  test("deve mostrar cards de resumo", async ({ page }) => {
    // Aguardar skeleton desaparecer — cards so aparecem apos loading=false
    // Os textos dos cards usam uppercase CSS, mas o conteudo no DOM e mixed-case
    await expect(page.getByText("Receita Total")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Atendimentos")).toBeVisible()
    await expect(page.getByText("Ticket Medio")).toBeVisible()
  })

  test("deve alternar entre periodo mensal e anual", async ({ page }) => {
    // Aguardar que os cards carreguem (loading=false) para os botoes de periodo estarem visiveis
    await expect(page.getByText("Receita Total")).toBeVisible({ timeout: 15_000 })

    // Os botoes de periodo sao <button> simples, nao role="button" com data-state
    const monthButton = page.getByRole("button", { name: /Este Mes/i })
    const yearButton = page.getByRole("button", { name: /Este Ano/i })

    await expect(monthButton).toBeVisible()
    await expect(yearButton).toBeVisible()

    // Click monthly period - o estado ativo e indicado por classe CSS (bg-background shadow-sm)
    await monthButton.click()
    await expect(monthButton).toHaveClass(/bg-background/)

    // Switch to annual period
    await yearButton.click()
    await expect(yearButton).toHaveClass(/bg-background/)
  })

  test("deve navegar entre tabs financeiras", async ({ page }) => {
    // Tabs sao <button> simples, NAO role="tab". Nao tem aria-selected.
    // O estado ativo e indicado por classe CSS (bg-background shadow-sm).
    const tabNames = ["Resumo", "Contas a Receber", "Despesas", "Fluxo de Caixa"]

    for (const tabName of tabNames) {
      const tab = page.getByRole("button", { name: tabName, exact: true })
      await tab.click()
      await expect(tab).toHaveClass(/bg-background/)
    }
  })

  test("deve mostrar receita por procedimento", async ({ page }) => {
    // Aguardar loading terminar — cards so aparecem apos fetch
    await expect(page.getByText("Receita Total")).toBeVisible({ timeout: 15_000 })

    // Ja estamos no tab Resumo por padrao
    // Pode ser que nao haja dados, entao verificamos o titulo do card OU a mensagem vazia
    await expect(
      page.getByText("Receita por Procedimento").or(
        page.getByText("Nenhum procedimento registrado")
      ).first()
    ).toBeVisible()
  })

  test("deve mostrar ultimas transacoes", async ({ page }) => {
    // Aguardar loading terminar
    await expect(page.getByText("Receita Total")).toBeVisible({ timeout: 15_000 })

    // Ja estamos no tab Resumo por padrao
    await expect(
      page.getByText("Ultimas Transacoes").or(
        page.getByText("Nenhuma transacao")
      ).first()
    ).toBeVisible()
  })

  test("deve acessar tabela de precos", async ({ page }) => {
    const tabelaTab = page.getByRole("button", { name: "Tabela de Precos", exact: true })
    await tabelaTab.click()
    await expect(tabelaTab).toHaveClass(/bg-background/)

    // Verificar que a tab de pricing carregou — ou tem inputs de preco ou mensagem vazia
    const priceInputs = page.locator('input[type="number"]')
    const emptyMessage = page.getByText("Nenhum procedimento configurado")

    await expect(
      priceInputs.first().or(emptyMessage)
    ).toBeVisible({ timeout: 10_000 })
  })

  test("deve editar preco de procedimento", async ({ page }) => {
    // Navigate to Tabela de Precos tab
    const tabelaTab = page.getByRole("button", { name: "Tabela de Precos", exact: true })
    await tabelaTab.click()

    // Find the first price input
    const priceInput = page.locator('input[type="number"]').first()
    const hasInputs = await priceInput.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasInputs) {
      // Sem procedimentos configurados — skip gracefully
      test.skip()
      return
    }

    await priceInput.clear()
    await priceInput.fill("150")
    await priceInput.blur()

    // Verify success feedback (toast via Sonner)
    await expect(
      page.getByText(/salvo/i)
        .or(page.getByText(/sucesso/i))
        .or(page.getByText(/atualizado/i))
        .or(page.locator('[data-sonner-toast]'))
        .first()
    ).toBeVisible({ timeout: 5000 })
  })
})
