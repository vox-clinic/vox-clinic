import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}))

const mockSearchPatients = vi.fn()

vi.mock("@/server/actions/patient", () => ({
  searchPatients: (...args: any[]) => mockSearchPatients(...args),
}))

// Mock the Dialog component to render children directly when open
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogTitle: ({ children, className }: any) => <span className={className}>{children}</span>,
}))

import { CommandPalette } from "../command-palette"

beforeEach(() => {
  vi.clearAllMocks()
  mockSearchPatients.mockResolvedValue([])
})

describe("CommandPalette", () => {
  it("renders trigger button with Buscar text", () => {
    render(<CommandPalette />)
    expect(screen.getByText("Buscar...")).toBeInTheDocument()
  })

  it("renders mobile trigger with Buscar aria-label", () => {
    render(<CommandPalette />)
    expect(screen.getByLabelText("Buscar")).toBeInTheDocument()
  })

  it("opens with Cmd+K keyboard shortcut", async () => {
    render(<CommandPalette />)

    // Dialog should not be open initially
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()

    // Simulate Cmd+K
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
      )
    })

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
  })

  it("opens with Ctrl+K keyboard shortcut", async () => {
    render(<CommandPalette />)

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
      )
    })

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
  })

  it("search input renders and accepts text", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    // Open palette via button click
    await user.click(screen.getByText("Buscar..."))

    const input = screen.getByPlaceholderText("Buscar pacientes, paginas, acoes...")
    expect(input).toBeInTheDocument()

    await user.type(input, "test")
    expect(input).toHaveValue("test")
  })

  it("page navigation items render when palette is open", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    await user.click(screen.getByText("Buscar..."))

    expect(screen.getByText("Paginas")).toBeInTheDocument()
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Pacientes")).toBeInTheDocument()
    expect(screen.getByText("Agenda")).toBeInTheDocument()
    expect(screen.getByText("Configuracoes")).toBeInTheDocument()
  })

  it("action items render when palette is open", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    await user.click(screen.getByText("Buscar..."))

    expect(screen.getByText("Acoes")).toBeInTheDocument()
    expect(screen.getByText("Nova Consulta")).toBeInTheDocument()
    expect(screen.getByText("Cadastro por Voz")).toBeInTheDocument()
    expect(screen.getByText("Novo Paciente (Manual)")).toBeInTheDocument()
  })

  it("clicking a page item navigates to it", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    await user.click(screen.getByText("Buscar..."))
    await user.click(screen.getByText("Dashboard"))

    expect(mockPush).toHaveBeenCalledWith("/dashboard")
  })

  it("clicking an action item navigates to it", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    await user.click(screen.getByText("Buscar..."))
    await user.click(screen.getByText("Nova Consulta"))

    expect(mockPush).toHaveBeenCalledWith("/appointments/new")
  })

  it("shows empty state prompt when no query", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    await user.click(screen.getByText("Buscar..."))

    expect(
      screen.getByText("Digite para buscar pacientes, paginas ou acoes")
    ).toBeInTheDocument()
  })

  it("filters pages based on search query", async () => {
    const user = userEvent.setup()
    render(<CommandPalette />)

    await user.click(screen.getByText("Buscar..."))
    const input = screen.getByPlaceholderText("Buscar pacientes, paginas, acoes...")

    await user.type(input, "config")

    // Configuracoes should match via keywords
    expect(screen.getByText("Configuracoes")).toBeInTheDocument()
    // Dashboard should not match "config"
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()
  })
})
