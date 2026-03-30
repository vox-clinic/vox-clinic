/**
 * RBAC Permission Constants for VoxClinic
 *
 * Defines workspace-level roles and their permissions.
 * Used both server-side (enforcement) and client-side (UI gating).
 */

export const ROLES = ["owner", "admin", "doctor", "secretary", "viewer"] as const
export type WorkspaceRole = (typeof ROLES)[number]

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Proprietario",
  admin: "Administrador",
  doctor: "Profissional",
  secretary: "Secretaria",
  viewer: "Visualizador",
}

/** Roles available for invitation (owner is assigned automatically to workspace creator) */
export const INVITABLE_ROLES: WorkspaceRole[] = ["admin", "doctor", "secretary", "viewer"]

export const PERMISSIONS = {
  // Patients
  "patients.list": ["owner", "admin", "doctor", "secretary", "viewer"],
  "patients.view.clinical": ["owner", "admin", "doctor"],
  "patients.create": ["owner", "admin", "doctor", "secretary"],
  "patients.edit": ["owner", "admin", "doctor", "secretary"],
  "patients.delete": ["owner", "admin"],
  // Appointments
  "appointments.view": ["owner", "admin", "doctor", "secretary", "viewer"],
  "appointments.create": ["owner", "admin", "doctor", "secretary"],
  "appointments.edit": ["owner", "admin", "doctor", "secretary"],
  // Clinical
  "clinical.prescriptions": ["owner", "admin", "doctor"],
  "clinical.certificates": ["owner", "admin", "doctor"],
  "clinical.recordings": ["owner", "admin", "doctor"],
  "clinical.forms": ["owner", "admin", "doctor"],
  // Financial
  "financial.view": ["owner", "admin"],
  "financial.edit": ["owner", "admin"],
  "financial.nfse": ["owner", "admin"],
  "financial.tiss": ["owner", "admin", "secretary"],
  // Commissions
  "commissions.view": ["owner", "admin"],
  "commissions.edit": ["owner", "admin"],
  "commissions.view_own": ["owner", "admin", "doctor"],
  // Reports
  "reports.view": ["owner", "admin", "doctor"],
  // Settings
  "settings.view": ["owner", "admin"],
  "settings.edit": ["owner", "admin"],
  // Team
  "team.manage": ["owner", "admin"],
  // Billing
  "billing.manage": ["owner"],
  // Waitlist
  "waitlist.view": ["owner", "admin", "doctor", "secretary"],
  "waitlist.edit": ["owner", "admin", "secretary"],
  // Messaging
  "messaging.view": ["owner", "admin", "doctor", "secretary"],
  "messaging.send": ["owner", "admin", "doctor", "secretary"],
  // Inventory
  "inventory.view": ["owner", "admin", "doctor", "secretary"],
  "inventory.edit": ["owner", "admin"],
  // Gateway de Pagamento
  "gateway.view": ["owner", "admin"],
  "gateway.edit": ["owner", "admin"],
  // Quotes (Orçamentos)
  "quotes.view": ["owner", "admin", "doctor", "secretary"],
  "quotes.create": ["owner", "admin", "doctor", "secretary"],
  "quotes.approve": ["owner", "admin", "doctor"],
  "quotes.execute": ["owner", "admin", "doctor"],
} as const satisfies Record<string, readonly WorkspaceRole[]>

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a workspace role has a specific permission.
 */
export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

/**
 * Throws if the role lacks the given permission.
 * Import this in server actions after resolving the user's role.
 * PermissionError is caught by safeAction and returned as { error }.
 */
export function requirePermission(role: WorkspaceRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionError()
  }
}

/**
 * Custom error class for permission failures.
 * safeAction can be extended to catch this, or server actions can
 * import ActionError separately and re-throw.
 */
export class PermissionError extends Error {
  constructor(message = "Sem permissão para esta ação.") {
    super(message)
    this.name = "PermissionError"
  }
}

/**
 * Normalize legacy role values to current WorkspaceRole.
 * Legacy "member" role maps to "doctor" for backward compatibility.
 */
export function normalizeRole(role: string): WorkspaceRole {
  if (role === "member") return "doctor"
  if ((ROLES as readonly string[]).includes(role)) return role as WorkspaceRole
  return "doctor" // safe default
}
