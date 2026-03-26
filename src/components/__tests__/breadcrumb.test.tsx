import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { Breadcrumb } from "../breadcrumb"

describe("Breadcrumb", () => {
  it("renders breadcrumb items", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Pacientes", href: "/patients" },
          { label: "Joao" },
        ]}
      />
    )
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Pacientes")).toBeInTheDocument()
    expect(screen.getByText("Joao")).toBeInTheDocument()
  })

  it("last item is not a link (current page)", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Pacientes" },
        ]}
      />
    )
    const lastItem = screen.getByText("Pacientes")
    expect(lastItem.tagName).toBe("SPAN")
    expect(lastItem.closest("a")).toBeNull()
  })

  it("intermediate items are links with correct href", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Pacientes", href: "/patients" },
          { label: "Detalhe" },
        ]}
      />
    )
    const homeLink = screen.getByText("Home").closest("a")
    expect(homeLink).toHaveAttribute("href", "/")

    const pacientesLink = screen.getByText("Pacientes").closest("a")
    expect(pacientesLink).toHaveAttribute("href", "/patients")
  })

  it("has nav element with aria-label", () => {
    render(
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Page" }]} />
    )
    const nav = screen.getByRole("navigation")
    expect(nav).toHaveAttribute("aria-label", "Navegação")
  })

  it("renders chevron separators between items (not before first)", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "A", href: "/" },
          { label: "B", href: "/b" },
          { label: "C" },
        ]}
      />
    )
    // ChevronRight renders as an svg. There should be 2 separators for 3 items.
    const svgs = container.querySelectorAll("svg")
    expect(svgs.length).toBe(2)
  })

  it("single item renders without separator", () => {
    const { container } = render(
      <Breadcrumb items={[{ label: "Home" }]} />
    )
    const svgs = container.querySelectorAll("svg")
    expect(svgs.length).toBe(0)
  })
})
