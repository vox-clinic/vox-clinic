import { test as setup, expect } from "@playwright/test"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/sign-in")
  await page.waitForLoadState("networkidle")

  // Step 1: Fill email
  const emailInput = page.getByPlaceholder(/e-mail/i)
  await emailInput.waitFor({ timeout: 15_000 })
  await emailInput.fill(process.env.TEST_ADMIN_EMAIL!)

  // Click "Continuar" (exact to avoid matching Google button)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()

  // Step 2: Fill password
  const passwordInput = page.getByPlaceholder(/senha/i)
  await passwordInput.waitFor({ timeout: 10_000 })
  await passwordInput.fill(process.env.TEST_ADMIN_PASSWORD!)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()

  // Wait for post-login redirect
  await page.waitForURL(/\/(dashboard|onboarding|$)/, { timeout: 30_000 })

  // If landed on home, go to dashboard
  if (page.url().match(/localhost:\d+\/?$/)) {
    await page.goto("/dashboard")
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
  }

  // If onboarding required, complete it
  if (page.url().includes("/onboarding")) {
    // Step 1/4: Select profession
    await page.getByText("Dentista").click()
    await page.getByRole("button", { name: "Continuar" }).click()

    // Step 2/4: Answer contextual questions — click Continuar to skip/proceed
    await page.waitForTimeout(1000)
    await page.getByRole("button", { name: "Continuar" }).click()

    // Step 3/4: Business name
    const clinicInput = page.locator("#clinicName")
    await clinicInput.waitFor({ timeout: 5_000 })
    await clinicInput.fill("Clinica E2E Teste")
    await page.getByRole("button", { name: /gerar/i }).click()

    // Step 4/4: Review and confirm — wait for workspace generation
    await page.getByRole("button", { name: /confirmar/i }).waitFor({ timeout: 30_000 })
    await page.getByRole("button", { name: /confirmar/i }).click()

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  }

  // Verify we're on dashboard
  await expect(page).toHaveURL(/dashboard/)

  // Save auth state
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" })
})
