import { vi } from "vitest"

// Create a mock transaction handler that passes the mockDb itself
// so that tx.model.method calls work the same as db.model.method
export const mockDb: any = {
  user: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  workspace: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  patient: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
  appointment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
  recording: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
  treatmentPlan: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  notification: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  auditLog: { create: vi.fn() },
  consentRecord: { create: vi.fn() },
  patientDocument: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
  whatsAppConfig: { findFirst: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  whatsAppConversation: { findMany: vi.fn(), upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  whatsAppMessage: { findMany: vi.fn(), upsert: vi.fn(), create: vi.fn() },
  workspaceMember: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  workspaceInvite: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  blockedSlot: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findFirst: vi.fn() },
  agenda: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  bookingConfig: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), create: vi.fn() },
  npsSurvey: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  usageRecord: { findMany: vi.fn(), upsert: vi.fn(), create: vi.fn() },
  charge: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  payment: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
  prescription: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
  medicalCertificate: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
  medicationDatabase: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), upsert: vi.fn() },
  medicationFavorite: { findMany: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  waitlistEntry: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  $transaction: vi.fn((fn: any) => fn(mockDb)),
  $queryRaw: vi.fn(),
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
}

vi.mock("@/lib/db", () => ({ db: mockDb }))
