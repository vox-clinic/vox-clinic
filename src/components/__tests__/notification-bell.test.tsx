import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockGetNotifications = vi.fn()
const mockGetUnreadCount = vi.fn()
const mockMarkAsRead = vi.fn()
const mockMarkAllAsRead = vi.fn()

vi.mock("@/server/actions/notification", () => ({
  getNotifications: (...args: any[]) => mockGetNotifications(...args),
  getUnreadCount: (...args: any[]) => mockGetUnreadCount(...args),
  markAsRead: (...args: any[]) => mockMarkAsRead(...args),
  markAllAsRead: (...args: any[]) => mockMarkAllAsRead(...args),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

import { NotificationBell } from "../notification-bell"

const sampleNotifications = [
  {
    id: "1",
    type: "appointment_soon",
    title: "Consulta em 30min",
    body: "Joao Silva - 14:00",
    entityType: "appointment",
    entityId: "a1",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    type: "system",
    title: "Atualizacao do sistema",
    body: null,
    entityType: null,
    entityId: null,
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetNotifications.mockResolvedValue([])
  mockGetUnreadCount.mockResolvedValue(0)
  mockMarkAsRead.mockResolvedValue(undefined)
  mockMarkAllAsRead.mockResolvedValue(undefined)
})

describe("NotificationBell", () => {
  it("renders bell icon button", async () => {
    await act(async () => {
      render(<NotificationBell />)
    })
    expect(screen.getByLabelText("Notificacoes")).toBeInTheDocument()
  })

  it("shows unread count badge when notifications exist", async () => {
    mockGetNotifications.mockResolvedValue(sampleNotifications)
    mockGetUnreadCount.mockResolvedValue(3)

    await act(async () => {
      render(<NotificationBell />)
    })

    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("does not show badge when unread count is 0", async () => {
    mockGetUnreadCount.mockResolvedValue(0)

    await act(async () => {
      render(<NotificationBell />)
    })

    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("shows 9+ when unread count exceeds 9", async () => {
    mockGetNotifications.mockResolvedValue(sampleNotifications)
    mockGetUnreadCount.mockResolvedValue(15)

    await act(async () => {
      render(<NotificationBell />)
    })

    expect(screen.getByText("9+")).toBeInTheDocument()
  })

  it("dropdown opens on click", async () => {
    const user = userEvent.setup()
    mockGetNotifications.mockResolvedValue(sampleNotifications)
    mockGetUnreadCount.mockResolvedValue(1)

    await act(async () => {
      render(<NotificationBell />)
    })

    await user.click(screen.getByLabelText("Notificacoes"))

    expect(screen.getByText("Notificacoes")).toBeInTheDocument()
    expect(screen.getByText("Consulta em 30min")).toBeInTheDocument()
    expect(screen.getByText("Atualizacao do sistema")).toBeInTheDocument()
  })

  it("shows empty state when no notifications", async () => {
    const user = userEvent.setup()
    mockGetNotifications.mockResolvedValue([])
    mockGetUnreadCount.mockResolvedValue(0)

    await act(async () => {
      render(<NotificationBell />)
    })

    await user.click(screen.getByLabelText("Notificacoes"))

    expect(screen.getByText("Nenhuma notificação")).toBeInTheDocument()
  })

  it("mark all as read button calls markAllAsRead", async () => {
    const user = userEvent.setup()
    mockGetNotifications.mockResolvedValue(sampleNotifications)
    mockGetUnreadCount.mockResolvedValue(1)

    await act(async () => {
      render(<NotificationBell />)
    })

    await user.click(screen.getByLabelText("Notificacoes"))
    await user.click(screen.getByText("Marcar tudo como lido"))

    expect(mockMarkAllAsRead).toHaveBeenCalled()
  })

  it("notification body renders when present", async () => {
    const user = userEvent.setup()
    mockGetNotifications.mockResolvedValue(sampleNotifications)
    mockGetUnreadCount.mockResolvedValue(1)

    await act(async () => {
      render(<NotificationBell />)
    })

    await user.click(screen.getByLabelText("Notificacoes"))

    expect(screen.getByText("Joao Silva - 14:00")).toBeInTheDocument()
  })

  it("dropdown uses responsive width (not only fixed w-80)", async () => {
    const user = userEvent.setup()
    mockGetNotifications.mockResolvedValue(sampleNotifications)
    mockGetUnreadCount.mockResolvedValue(1)

    await act(async () => {
      render(<NotificationBell />)
    })

    await user.click(screen.getByLabelText("Notificacoes"))

    // The dropdown should have responsive width class
    const dropdown = screen.getByText("Notificacoes").closest(
      "[class*='w-[calc']"
    )
    expect(dropdown).toBeInTheDocument()
  })
})
