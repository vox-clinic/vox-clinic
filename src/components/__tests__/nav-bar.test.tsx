import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { NavBar } from "../landing/nav-bar"

describe("NavBar", () => {
  it("renders logo with VoxClinic text", () => {
    render(<NavBar />)
    expect(screen.getByText("Vox")).toBeInTheDocument()
    expect(screen.getByText("Clinic")).toBeInTheDocument()
  })

  it("shows Entrar and Comecar Gratis when not authenticated", () => {
    render(<NavBar isAuthenticated={false} />)
    const entrarLinks = screen.getAllByText("Entrar")
    const gratisLinks = screen.getAllByText("Comecar Gratis")
    expect(entrarLinks.length).toBeGreaterThanOrEqual(1)
    expect(gratisLinks.length).toBeGreaterThanOrEqual(1)
  })

  it("shows Ir para o Dashboard when authenticated", () => {
    render(<NavBar isAuthenticated={true} />)
    const dashLinks = screen.getAllByText("Ir para o Dashboard")
    expect(dashLinks.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument()
  })

  it("renders nav links (Funcionalidades, Como Funciona, Precos, FAQ)", () => {
    render(<NavBar />)
    // Desktop links + mobile links (when open). Desktop should be present.
    expect(screen.getByText("Funcionalidades")).toBeInTheDocument()
    expect(screen.getByText("Como Funciona")).toBeInTheDocument()
    expect(screen.getByText("Precos")).toBeInTheDocument()
    expect(screen.getByText("FAQ")).toBeInTheDocument()
  })

  it("nav links have correct href attributes", () => {
    render(<NavBar />)
    const funcLink = screen.getByText("Funcionalidades")
    expect(funcLink).toHaveAttribute("href", "#features")

    const comoLink = screen.getByText("Como Funciona")
    expect(comoLink).toHaveAttribute("href", "#how-it-works")

    const precosLink = screen.getByText("Precos")
    expect(precosLink).toHaveAttribute("href", "#pricing")

    const faqLink = screen.getByText("FAQ")
    expect(faqLink).toHaveAttribute("href", "#faq")
  })

  it("mobile hamburger toggles menu visibility", async () => {
    const user = userEvent.setup()
    render(<NavBar />)

    // Mobile menu content should not be visible initially.
    // The Entrar link in the mobile menu is inside the mobileOpen conditional block.
    // There are desktop CTAs (hidden md:hidden), so we check for the hamburger button.
    const hamburger = screen.getByLabelText("Abrir menu")
    expect(hamburger).toBeInTheDocument()

    await user.click(hamburger)

    // After click, close button should appear
    expect(screen.getByLabelText("Fechar menu")).toBeInTheDocument()

    // Mobile nav links should now be doubled (desktop + mobile)
    const funcLinks = screen.getAllByText("Funcionalidades")
    expect(funcLinks.length).toBe(2)

    // Click again to close
    await user.click(screen.getByLabelText("Fechar menu"))
    expect(screen.getByLabelText("Abrir menu")).toBeInTheDocument()
  })

  it("Entrar links point to /sign-in", () => {
    render(<NavBar />)
    const entrarLinks = screen.getAllByText("Entrar")
    entrarLinks.forEach((link) => {
      expect(link.closest("a")).toHaveAttribute("href", "/sign-in")
    })
  })

  it("Comecar Gratis links point to /sign-up", () => {
    render(<NavBar />)
    const gratisLinks = screen.getAllByText("Comecar Gratis")
    gratisLinks.forEach((link) => {
      expect(link.closest("a")).toHaveAttribute("href", "/sign-up")
    })
  })

  it("Dashboard link uses custom dashboardUrl prop", () => {
    render(<NavBar isAuthenticated={true} dashboardUrl="/custom-dash" />)
    const dashLinks = screen.getAllByText("Ir para o Dashboard")
    dashLinks.forEach((link) => {
      expect(link.closest("a")).toHaveAttribute("href", "/custom-dash")
    })
  })
})
