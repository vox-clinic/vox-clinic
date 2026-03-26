// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  ExtractedPatientDataSchema,
  WorkspaceConfigSchema,
  AppointmentSummarySchema,
} from "@/lib/schemas"

// ============================================
// ExtractedPatientDataSchema
// ============================================
describe("ExtractedPatientDataSchema", () => {
  it("should accept valid complete data", () => {
    const data = {
      name: "Maria Silva",
      document: "123.456.789-00",
      phone: "+5511999998888",
      email: "maria@example.com",
      birthDate: "1990-05-15",
      age: 35,
      procedures: ["Limpeza", "Restauracao"],
      notes: "Paciente com dor no dente 36",
      alerts: ["Alergia a penicilina"],
      customData: { convenio: "Unimed" },
      confidence: { name: 0.95, document: 0.8 },
    }
    const result = ExtractedPatientDataSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Maria Silva")
      expect(result.data.procedures).toEqual(["Limpeza", "Restauracao"])
      expect(result.data.confidence).toEqual({ name: 0.95, document: 0.8 })
    }
  })

  it("should accept minimal/empty data with defaults", () => {
    const result = ExtractedPatientDataSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBeNull()
      expect(result.data.document).toBeNull()
      expect(result.data.phone).toBeNull()
      expect(result.data.email).toBeNull()
      expect(result.data.birthDate).toBeNull()
      expect(result.data.age).toBeNull()
      expect(result.data.procedures).toEqual([])
      expect(result.data.notes).toBeNull()
      expect(result.data.alerts).toEqual([])
      expect(result.data.customData).toEqual({})
      expect(result.data.confidence).toEqual({})
    }
  })

  it("should accept null values for nullable fields", () => {
    const data = {
      name: null,
      document: null,
      phone: null,
      email: null,
      birthDate: null,
      age: null,
      notes: null,
    }
    const result = ExtractedPatientDataSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it("should reject invalid age type", () => {
    const result = ExtractedPatientDataSchema.safeParse({ age: "thirty" })
    expect(result.success).toBe(false)
  })

  it("should reject invalid procedures type (not array)", () => {
    const result = ExtractedPatientDataSchema.safeParse({ procedures: "Limpeza" })
    expect(result.success).toBe(false)
  })

  it("should strip extra fields", () => {
    const data = { name: "Test", unknownField: "should be stripped" }
    const result = ExtractedPatientDataSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as any).unknownField).toBeUndefined()
    }
  })

  it("should accept empty string for name", () => {
    const result = ExtractedPatientDataSchema.safeParse({ name: "" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("")
    }
  })

  it("should accept confidence values as numbers", () => {
    const result = ExtractedPatientDataSchema.safeParse({
      confidence: { name: 0.0, phone: 1.0, email: 0.5 },
    })
    expect(result.success).toBe(true)
  })

  it("should reject non-number confidence values", () => {
    const result = ExtractedPatientDataSchema.safeParse({
      confidence: { name: "high" },
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// WorkspaceConfigSchema
// ============================================
describe("WorkspaceConfigSchema", () => {
  it("should accept valid complete workspace config", () => {
    const data = {
      procedures: [
        { id: "p1", name: "Limpeza", category: "Preventivo" },
        { id: "p2", name: "Restauracao" },
      ],
      customFields: [
        { id: "f1", name: "Convenio", type: "text", required: true },
        { id: "f2", name: "Peso", type: "number", required: false },
      ],
      anamnesisTemplate: [
        { id: "a1", question: "Alergias?", type: "text" },
        { id: "a2", question: "Fuma?", type: "boolean" },
        { id: "a3", question: "Tipo sanguineo", type: "select", options: ["A+", "B+", "O+"] },
      ],
      categories: [
        { id: "c1", name: "Preventivo" },
        { id: "c2", name: "Restaurador" },
      ],
    }
    const result = WorkspaceConfigSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.procedures).toHaveLength(2)
      expect(result.data.procedures[1].category).toBe("Geral") // default
      expect(result.data.customFields).toHaveLength(2)
      expect(result.data.anamnesisTemplate).toHaveLength(3)
      expect(result.data.categories).toHaveLength(2)
    }
  })

  it("should apply defaults for empty config", () => {
    const result = WorkspaceConfigSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.procedures).toEqual([])
      expect(result.data.customFields).toEqual([])
      expect(result.data.anamnesisTemplate).toEqual([])
      expect(result.data.categories).toEqual([])
    }
  })

  it("should reject procedure without required id", () => {
    const result = WorkspaceConfigSchema.safeParse({
      procedures: [{ name: "Limpeza" }],
    })
    expect(result.success).toBe(false)
  })

  it("should reject procedure without required name", () => {
    const result = WorkspaceConfigSchema.safeParse({
      procedures: [{ id: "p1" }],
    })
    expect(result.success).toBe(false)
  })

  it("should reject customField with invalid type", () => {
    const result = WorkspaceConfigSchema.safeParse({
      customFields: [{ id: "f1", name: "X", type: "invalid_type" }],
    })
    expect(result.success).toBe(false)
  })

  it("should accept all valid customField types", () => {
    const types = ["text", "number", "boolean", "date", "select"] as const
    for (const type of types) {
      const result = WorkspaceConfigSchema.safeParse({
        customFields: [{ id: "f1", name: "Field", type }],
      })
      expect(result.success).toBe(true)
    }
  })

  it("should reject anamnesisTemplate with invalid type", () => {
    const result = WorkspaceConfigSchema.safeParse({
      anamnesisTemplate: [{ id: "a1", question: "Q?", type: "multiselect" }],
    })
    expect(result.success).toBe(false)
  })

  it("should default customField required to false", () => {
    const result = WorkspaceConfigSchema.safeParse({
      customFields: [{ id: "f1", name: "Field", type: "text" }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customFields[0].required).toBe(false)
    }
  })

  it("should default procedure category to Geral", () => {
    const result = WorkspaceConfigSchema.safeParse({
      procedures: [{ id: "p1", name: "Test" }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.procedures[0].category).toBe("Geral")
    }
  })
})

// ============================================
// AppointmentSummarySchema
// ============================================
describe("AppointmentSummarySchema", () => {
  it("should accept valid complete summary", () => {
    const data = {
      procedures: ["Limpeza", "Restauracao"],
      observations: "Paciente apresentou sensibilidade",
      recommendations: "Evitar alimentos gelados por 48h",
      nextAppointment: "Retorno em 30 dias",
    }
    const result = AppointmentSummarySchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.procedures).toEqual(["Limpeza", "Restauracao"])
      expect(result.data.observations).toBe("Paciente apresentou sensibilidade")
    }
  })

  it("should apply defaults for empty object", () => {
    const result = AppointmentSummarySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.procedures).toEqual([])
      expect(result.data.observations).toBeNull()
      expect(result.data.recommendations).toBeNull()
      expect(result.data.nextAppointment).toBeNull()
    }
  })

  it("should accept null values for optional fields", () => {
    const result = AppointmentSummarySchema.safeParse({
      procedures: ["Exame"],
      observations: null,
      recommendations: null,
      nextAppointment: null,
    })
    expect(result.success).toBe(true)
  })

  it("should reject non-array procedures", () => {
    const result = AppointmentSummarySchema.safeParse({ procedures: "Limpeza" })
    expect(result.success).toBe(false)
  })

  it("should accept empty procedures array", () => {
    const result = AppointmentSummarySchema.safeParse({ procedures: [] })
    expect(result.success).toBe(true)
  })

  it("should strip extra fields", () => {
    const data = { procedures: [], extraField: "nope" }
    const result = AppointmentSummarySchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as any).extraField).toBeUndefined()
    }
  })
})
