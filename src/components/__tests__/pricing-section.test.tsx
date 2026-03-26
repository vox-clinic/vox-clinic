import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/components/ui/blur-fade", () => ({
  BlurFade: ({ children }: any) => <div>{children}</div>,
}))

vi.mock("@/components/ui/shine-border", () => ({
  ShineBorder: () => null,
}))

import { PricingSection } from "../landing/pricing-section"

describe("PricingSection", () => {
  it("renders 3 pricing tiers", () => {
    render(<PricingSection />)
    expect(screen.getByText("Gratis")).toBeInTheDocument()
    expect(screen.getByText("Profissional")).toBeInTheDocument()
    expect(screen.getByText("Clinica")).toBeInTheDocument()
  })

  it("Gratis shows R$ 0", () => {
    render(<PricingSection />)
    expect(screen.getByText("R$ 0")).toBeInTheDocument()
  })

  it("Profissional shows R$ 97", () => {
    render(<PricingSection />)
    expect(screen.getByText("R$ 97")).toBeInTheDocument()
  })

  it("Clinica shows R$ 197", () => {
    render(<PricingSection />)
    expect(screen.getByText("R$ 197")).toBeInTheDocument()
  })

  it("Profissional has Mais popular badge", () => {
    render(<PricingSection />)
    expect(screen.getByText("Mais popular")).toBeInTheDocument()
  })

  it("Gratis and Clinica do not have a badge", () => {
    render(<PricingSection />)
    // Only one badge element should exist
    const badges = screen.getAllByText("Mais popular")
    expect(badges).toHaveLength(1)
  })

  it("each tier has a CTA button", () => {
    render(<PricingSection />)
    expect(screen.getByText("Comecar Gratis")).toBeInTheDocument()
    expect(screen.getByText("Assinar Profissional")).toBeInTheDocument()
    expect(screen.getByText("Falar com vendas")).toBeInTheDocument()
  })

  it("CTA buttons link to /sign-up", () => {
    render(<PricingSection />)
    const ctas = ["Comecar Gratis", "Assinar Profissional", "Falar com vendas"]
    ctas.forEach((text) => {
      const el = screen.getByText(text)
      expect(el.closest("a")).toHaveAttribute("href", "/sign-up")
    })
  })

  it("Gratis features render correctly", () => {
    render(<PricingSection />)
    expect(screen.getByText("Ate 50 consultas/mes")).toBeInTheDocument()
    expect(screen.getByText("1 profissional")).toBeInTheDocument()
    expect(screen.getByText("Transcricao por voz")).toBeInTheDocument()
    expect(screen.getByText("Prontuario basico")).toBeInTheDocument()
    expect(screen.getByText("Agenda com calendario")).toBeInTheDocument()
  })

  it("Profissional features render correctly", () => {
    render(<PricingSection />)
    expect(screen.getByText("Tudo do plano Gratis")).toBeInTheDocument()
    expect(screen.getByText("Consultas ilimitadas")).toBeInTheDocument()
    expect(screen.getByText("IA avancada (Claude)")).toBeInTheDocument()
    expect(screen.getByText("WhatsApp Business")).toBeInTheDocument()
    expect(screen.getByText("Relatorios e analytics")).toBeInTheDocument()
    expect(screen.getByText("Suporte prioritario")).toBeInTheDocument()
  })

  it("Clinica features render correctly", () => {
    render(<PricingSection />)
    expect(screen.getByText("Tudo do Profissional")).toBeInTheDocument()
    expect(screen.getByText("Equipe ilimitada")).toBeInTheDocument()
    expect(screen.getByText("Multi-agenda")).toBeInTheDocument()
    expect(screen.getByText("Importacao CSV")).toBeInTheDocument()
    expect(screen.getByText("Onboarding dedicado")).toBeInTheDocument()
    expect(screen.getByText("API de integracao")).toBeInTheDocument()
  })
})
