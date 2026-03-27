/**
 * Plan limits and enforcement for VoxClinic workspaces.
 *
 * Plans: free, pro, enterprise
 * Each plan has limits on patients, appointments/month, recordings/month,
 * storage, team members, and feature access.
 */

export interface PlanLimits {
  maxPatients: number
  maxAppointmentsPerMonth: number
  maxRecordingsPerMonth: number
  maxStorageMb: number
  maxTeamMembers: number
  maxAgendas: number
  features: {
    whatsapp: boolean
    onlineBooking: boolean
    reports: boolean
    export: boolean
    certificates: boolean
    prescriptions: boolean
    treatments: boolean
    nps: boolean
  }
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxPatients: 50,
    maxAppointmentsPerMonth: 100,
    maxRecordingsPerMonth: 30,
    maxStorageMb: 500,
    maxTeamMembers: 1,
    maxAgendas: 1,
    features: {
      whatsapp: false,
      onlineBooking: false,
      reports: false,
      export: false,
      certificates: true,
      prescriptions: true,
      treatments: false,
      nps: false,
    },
  },
  pro: {
    maxPatients: 500,
    maxAppointmentsPerMonth: 1000,
    maxRecordingsPerMonth: 300,
    maxStorageMb: 5000,
    maxTeamMembers: 5,
    maxAgendas: 5,
    features: {
      whatsapp: true,
      onlineBooking: true,
      reports: true,
      export: true,
      certificates: true,
      prescriptions: true,
      treatments: true,
      nps: true,
    },
  },
  enterprise: {
    maxPatients: -1, // unlimited
    maxAppointmentsPerMonth: -1,
    maxRecordingsPerMonth: -1,
    maxStorageMb: -1,
    maxTeamMembers: -1,
    maxAgendas: -1,
    features: {
      whatsapp: true,
      onlineBooking: true,
      reports: true,
      export: true,
      certificates: true,
      prescriptions: true,
      treatments: true,
      nps: true,
    },
  },
}

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function isFeatureAllowed(plan: string, feature: keyof PlanLimits["features"]): boolean {
  const limits = getPlanLimits(plan)
  return limits.features[feature]
}

export function isWithinLimit(limit: number, current: number): boolean {
  if (limit === -1) return true // unlimited
  return current < limit
}
