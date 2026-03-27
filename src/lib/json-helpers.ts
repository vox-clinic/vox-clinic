import type { Prisma } from "@prisma/client"
import type { Procedure, CustomField, AnamnesisQuestion, Category } from "@/types"

// Read helpers: safely parse JSON fields from Prisma

export function readProcedures(json: Prisma.JsonValue): Procedure[] {
  if (!Array.isArray(json)) return []
  return json.map((p: unknown) => {
    const obj = p as Record<string, unknown>
    return {
      id: (obj?.id as string) ?? "",
      name: typeof p === "string" ? p : (obj?.name as string) ?? "",
      category: (obj?.category as string) ?? "Geral",
      price: typeof obj?.price === "number" ? obj.price : undefined,
      duration: typeof obj?.duration === "number" ? obj.duration : undefined,
    }
  })
}

export function readCustomFields(json: Prisma.JsonValue): CustomField[] {
  if (!Array.isArray(json)) return []
  return json as unknown as CustomField[]
}

export function readAnamnesisTemplate(json: Prisma.JsonValue): AnamnesisQuestion[] {
  if (!Array.isArray(json)) return []
  return json as unknown as AnamnesisQuestion[]
}

export function readCategories(json: Prisma.JsonValue): Category[] {
  if (!Array.isArray(json)) return []
  return json as unknown as Category[]
}

export function readAlerts(json: Prisma.JsonValue): string[] {
  if (!Array.isArray(json)) return []
  return json.filter((v): v is string => typeof v === "string")
}

export function readMedicalHistory(json: Prisma.JsonValue): Record<string, unknown> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {}
  return json as Record<string, unknown>
}

// Normalize procedures from mixed format (string[] or {name,duration}[]) to string[]
export function normalizeProcedureNames(json: Prisma.JsonValue): string[] {
  if (!Array.isArray(json)) return []
  return json.map((p: unknown) =>
    typeof p === "string" ? p : (p as Record<string, unknown>)?.name as string ?? String(p)
  )
}

// Write helper: cast typed values to Prisma-compatible JSON
export function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue
}
