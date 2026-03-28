import { describe, it, expect, beforeEach, vi } from "vitest"

// Mocks must be imported before the modules under test
import { mockDb } from "@/test/mocks/db"
import { mockAuth } from "@/test/mocks/auth"
import "@/test/mocks/services"

import {
  getTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeMember,
  acceptInvite,
} from "@/server/actions/team"
import {
  ERR_UNAUTHORIZED,
  ERR_WORKSPACE_NOT_CONFIGURED,
  ERR_ALREADY_MEMBER,
  ERR_INVITE_PENDING,
  ERR_INVITE_NOT_FOUND,
  ERR_INVITE_USED,
  ERR_INVITE_EXPIRED,
  ERR_INVITE_WRONG_EMAIL,
  ERR_MEMBER_NOT_FOUND,
} from "@/lib/error-messages"

// Standard user/workspace mock
const WORKSPACE_ID = "ws_test_123"
const CLERK_ID = "clerk_test_user_123"
const mockUser = {
  id: "user_1",
  clerkId: CLERK_ID,
  name: "Dr. Teste",
  email: "dr@test.com",
  clinicName: "Clinica Teste",
  workspace: { id: WORKSPACE_ID, userId: "user_1", plan: "pro" },
  memberships: [],
}

// Helper: set up requireOwnerOrAdmin to pass (user is workspace owner)
function setupOwnerAuth() {
  mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, userId: "user_1" })
  mockDb.user.findUnique.mockResolvedValue(mockUser)
}

describe("team actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: CLERK_ID })
    mockDb.user.findUnique.mockResolvedValue(mockUser)
  })

  // ─── getTeamMembers ─────────────────────────────────────────
  describe("getTeamMembers", () => {
    it("deve retornar membros do time, owner e convites pendentes", async () => {
      mockDb.workspace.findUnique.mockResolvedValue({
        id: WORKSPACE_ID,
        userId: "user_1",
        user: { id: "user_1", clerkId: CLERK_ID, name: "Dr. Teste", email: "dr@test.com" },
      })
      mockDb.workspaceMember.findMany.mockResolvedValue([
        {
          id: "member_1",
          role: "secretary",
          invitedAt: new Date("2024-06-01"),
          user: { id: "user_2", clerkId: "clerk_2", name: "Ana", email: "ana@test.com" },
        },
      ])
      mockDb.workspaceInvite.findMany.mockResolvedValue([
        {
          id: "inv_1",
          email: "novo@test.com",
          role: "doctor",
          status: "pending",
          createdAt: new Date("2024-06-15"),
          expiresAt: new Date("2024-06-22"),
        },
      ])

      const result = await getTeamMembers()

      expect(result.owner.id).toBe("user_1")
      expect(result.owner.role).toBe("owner")
      expect(result.members).toHaveLength(1)
      expect(result.members[0].role).toBe("secretary")
      expect(result.invites).toHaveLength(1)
      expect(result.invites[0].email).toBe("novo@test.com")

      // Verify workspace scoping
      expect(mockDb.workspaceMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workspaceId: WORKSPACE_ID } })
      )
    })

    it("deve lançar erro quando não autenticado", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      await expect(getTeamMembers()).rejects.toThrow(ERR_UNAUTHORIZED)
    })

    it("deve lançar erro quando workspace não configurado", async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: "user_1",
        clerkId: CLERK_ID,
        workspace: null,
        memberships: [],
      })

      await expect(getTeamMembers()).rejects.toThrow(ERR_WORKSPACE_NOT_CONFIGURED)
    })
  })

  // ─── inviteTeamMember ───────────────────────────────────────
  describe("inviteTeamMember", () => {
    it("deve criar convite e retornar id", async () => {
      setupOwnerAuth()
      // No existing user with that email
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
        .mockResolvedValueOnce(null)     // existingUser check
      mockDb.workspace.findUnique
        .mockResolvedValueOnce({ id: WORKSPACE_ID, userId: "user_1" }) // requireOwnerOrAdmin
        .mockResolvedValueOnce({ id: WORKSPACE_ID, plan: "pro" })      // plan check
      mockDb.workspaceInvite.findFirst.mockResolvedValue(null) // no pending invite
      mockDb.workspaceInvite.create.mockResolvedValue({ id: "inv_new" })

      const result = await inviteTeamMember("novo@test.com", "secretary")

      expect(result).toEqual({ id: "inv_new" })
      expect(mockDb.workspaceInvite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          email: "novo@test.com",
          role: "secretary",
        }),
      })
    })

    it("deve retornar erro para email duplicado (já é membro)", async () => {
      setupOwnerAuth()
      const existingUser = { id: "user_2", email: "existe@test.com" }
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
        .mockResolvedValueOnce(existingUser) // existingUser check
      mockDb.workspace.findUnique
        .mockResolvedValueOnce({ id: WORKSPACE_ID, userId: "user_1" }) // requireOwnerOrAdmin
        .mockResolvedValueOnce({ id: WORKSPACE_ID, plan: "pro" })      // plan check
      mockDb.workspaceMember.findFirst.mockResolvedValue({ id: "member_existing" }) // already a member

      const result = await inviteTeamMember("existe@test.com", "secretary")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_ALREADY_MEMBER)
    })

    it("deve retornar erro quando já existe convite pendente", async () => {
      setupOwnerAuth()
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
        .mockResolvedValueOnce(null)     // no existing user
      mockDb.workspace.findUnique
        .mockResolvedValueOnce({ id: WORKSPACE_ID, userId: "user_1" }) // requireOwnerOrAdmin
        .mockResolvedValueOnce({ id: WORKSPACE_ID, plan: "pro" })      // plan check
      mockDb.workspaceInvite.findFirst.mockResolvedValue({ id: "inv_existing" }) // pending invite exists

      const result = await inviteTeamMember("pending@test.com", "doctor")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_INVITE_PENDING)
    })

    it("deve retornar erro para role inválido", async () => {
      setupOwnerAuth()
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
      mockDb.workspace.findUnique
        .mockResolvedValueOnce({ id: WORKSPACE_ID, userId: "user_1" }) // requireOwnerOrAdmin
        .mockResolvedValueOnce({ id: WORKSPACE_ID, plan: "pro" })      // plan check

      const result = await inviteTeamMember("novo@test.com", "superadmin")

      expect(result).toHaveProperty("error")
    })
  })

  // ─── updateMemberRole ───────────────────────────────────────
  describe("updateMemberRole", () => {
    it("deve atualizar role do membro", async () => {
      setupOwnerAuth()
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
      mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, userId: "user_1" })
      mockDb.workspaceMember.findFirst.mockResolvedValue({
        id: "member_1",
        workspaceId: WORKSPACE_ID,
        user: { clerkId: "clerk_2" },
      })
      mockDb.workspaceMember.update.mockResolvedValue({ id: "member_1", role: "admin" })

      const result = await updateMemberRole("member_1", "admin")

      expect(result).toEqual({ success: true })
      expect(mockDb.workspaceMember.update).toHaveBeenCalledWith({
        where: { id: "member_1" },
        data: { role: "admin" },
      })
    })

    it("deve retornar erro para role inválido", async () => {
      setupOwnerAuth()
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
      mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, userId: "user_1" })

      const result = await updateMemberRole("member_1", "overlord")

      expect(result).toHaveProperty("error")
    })

    it("deve retornar erro quando membro não encontrado", async () => {
      setupOwnerAuth()
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
      mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, userId: "user_1" })
      mockDb.workspaceMember.findFirst.mockResolvedValue(null)

      const result = await updateMemberRole("nonexistent", "admin")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_MEMBER_NOT_FOUND)
    })
  })

  // ─── removeMember ──────────────────────────────────────────
  describe("removeMember", () => {
    it("deve remover membro do workspace", async () => {
      setupOwnerAuth()
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
      mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, userId: "user_1" })
      mockDb.workspaceMember.findFirst.mockResolvedValue({
        id: "member_1",
        workspaceId: WORKSPACE_ID,
        user: { clerkId: "clerk_2" },
      })
      mockDb.workspaceMember.delete.mockResolvedValue({ id: "member_1" })

      const result = await removeMember("member_1")

      expect(result).toEqual({ success: true })
      expect(mockDb.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: "member_1" } })
    })

    it("deve retornar erro quando membro não encontrado", async () => {
      setupOwnerAuth()
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // requireOwnerOrAdmin → owner lookup
      mockDb.workspace.findUnique.mockResolvedValue({ id: WORKSPACE_ID, userId: "user_1" })
      mockDb.workspaceMember.findFirst.mockResolvedValue(null)

      const result = await removeMember("nonexistent")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_MEMBER_NOT_FOUND)
    })
  })

  // ─── acceptInvite ──────────────────────────────────────────
  describe("acceptInvite", () => {
    it("deve aceitar convite válido e criar membership", async () => {
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // user lookup inside acceptInvite

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      // Transaction passes mockDb as tx
      mockDb.workspaceInvite.findUnique.mockResolvedValue({
        id: "inv_1",
        token: "valid-token",
        workspaceId: WORKSPACE_ID,
        email: "dr@test.com",
        role: "doctor",
        status: "pending",
        expiresAt: futureDate,
      })
      mockDb.workspaceMember.findFirst.mockResolvedValue(null) // not already a member
      mockDb.workspaceMember.create.mockResolvedValue({ id: "member_new" })
      mockDb.workspaceInvite.update.mockResolvedValue({ id: "inv_1", status: "accepted" })

      const result = await acceptInvite("valid-token")

      expect(result).toEqual({ workspaceId: WORKSPACE_ID })
      expect(mockDb.workspaceMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          userId: "user_1",
          role: "doctor",
        }),
      })
    })

    it("deve retornar erro para token inválido", async () => {
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // user lookup
      mockDb.workspaceInvite.findUnique.mockResolvedValue(null) // token not found

      const result = await acceptInvite("invalid-token")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_INVITE_NOT_FOUND)
    })

    it("deve retornar erro para convite já utilizado", async () => {
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // user lookup
      mockDb.workspaceInvite.findUnique.mockResolvedValue({
        id: "inv_1",
        token: "used-token",
        workspaceId: WORKSPACE_ID,
        email: "dr@test.com",
        role: "doctor",
        status: "accepted",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      const result = await acceptInvite("used-token")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_INVITE_USED)
    })

    it("deve retornar erro para convite expirado", async () => {
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // user lookup
      mockDb.workspaceInvite.findUnique.mockResolvedValue({
        id: "inv_1",
        token: "expired-token",
        workspaceId: WORKSPACE_ID,
        email: "dr@test.com",
        role: "doctor",
        status: "pending",
        expiresAt: new Date("2023-01-01"), // expired
      })

      const result = await acceptInvite("expired-token")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_INVITE_EXPIRED)
    })

    it("deve retornar erro quando email do convite não corresponde", async () => {
      mockDb.user.findUnique
        .mockResolvedValueOnce(mockUser) // getAuthContext
        .mockResolvedValueOnce(mockUser) // user lookup
      mockDb.workspaceInvite.findUnique.mockResolvedValue({
        id: "inv_1",
        token: "wrong-email-token",
        workspaceId: WORKSPACE_ID,
        email: "outro@test.com", // different from mockUser.email
        role: "doctor",
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      const result = await acceptInvite("wrong-email-token")

      expect(result).toHaveProperty("error")
      if ("error" in result) expect(result.error).toBe(ERR_INVITE_WRONG_EMAIL)
    })
  })
})
