import { vi, expect } from "vitest"

/**
 * Create a mock workspace context for server action tests.
 * Sets up mockAuth + mockDb.user.findUnique to return a user with workspace.
 */
export function setupWorkspaceContext(
  mockAuth: ReturnType<typeof vi.fn>,
  mockDb: any,
  overrides: {
    clerkId?: string
    userId?: string
    workspaceId?: string
    role?: string
  } = {}
) {
  const clerkId = overrides.clerkId ?? "clerk_test_user_123"
  const userId = overrides.userId ?? "user_1"
  const workspaceId = overrides.workspaceId ?? "ws_1"

  mockAuth.mockResolvedValue({ userId: clerkId })

  mockDb.user.findUnique.mockResolvedValue({
    id: userId,
    clerkId,
    workspace: { id: workspaceId },
    memberships: [{ workspaceId }],
  })

  return { clerkId, userId, workspaceId }
}

/**
 * Assert that a server action returned an error with a specific message.
 */
export function expectActionError(result: any, messageContains?: string) {
  expect(result).toHaveProperty("error")
  if (messageContains) {
    expect(result.error).toContain(messageContains)
  }
}

/**
 * Assert that a server action succeeded (no error property).
 */
export function expectActionSuccess(result: any) {
  expect(result).not.toHaveProperty("error")
}
