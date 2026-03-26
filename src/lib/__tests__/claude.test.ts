// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  return { mockCreate }
})

// Mock env before importing claude.ts
vi.mock("@/lib/env", () => ({
  env: {
    ANTHROPIC_API_KEY: "sk-ant-test-key",
  },
}))

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate }
    },
  }
})

import { extractEntities, generateConsultationSummary, generateWorkspaceSuggestions } from "@/lib/claude"

describe("extractEntities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should throw on empty transcript", async () => {
    await expect(extractEntities("", { customFields: [], procedures: [] })).rejects.toThrow(
      "Transcrição muito curta"
    )
  })

  it("should throw on transcript shorter than 10 chars", async () => {
    await expect(extractEntities("abc", { customFields: [], procedures: [] })).rejects.toThrow(
      "Transcrição muito curta"
    )
  })

  it("should call Claude with tool_use format and extract data", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_123",
          name: "extract_patient_data",
          input: {
            name: "Joao Silva",
            document: "123.456.789-00",
            phone: null,
            email: null,
            birthDate: null,
            age: 45,
            procedures: ["Limpeza"],
            notes: "Paciente com dor",
            alerts: [],
            customData: {},
            confidence: { name: 0.95, age: 0.7 },
          },
        },
      ],
    })

    const result = await extractEntities("Paciente Joao Silva, 45 anos, veio para limpeza", {
      customFields: [],
      procedures: [{ id: "p1", name: "Limpeza" }],
    })

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toBe("claude-sonnet-4-20250514")
    expect(callArgs.temperature).toBe(0)
    expect(callArgs.tools[0].name).toBe("extract_patient_data")
    expect(callArgs.tool_choice).toEqual({ type: "tool", name: "extract_patient_data" })

    expect(result.name).toBe("Joao Silva")
    expect(result.age).toBe(45)
    expect(result.procedures).toEqual(["Limpeza"])
  })

  it("should fall back to text parsing when no tool_use block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            name: "Ana Costa",
            procedures: ["Exame"],
            confidence: { name: 0.9 },
          }),
        },
      ],
    })

    const result = await extractEntities("Paciente Ana Costa veio para exame de rotina", {
      customFields: [],
      procedures: [],
    })

    expect(result.name).toBe("Ana Costa")
    expect(result.procedures).toEqual(["Exame"])
  })

  it("should handle text with markdown fences in fallback", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: "```json\n" + JSON.stringify({
            name: "Pedro",
            procedures: [],
            confidence: {},
          }) + "\n```",
        },
      ],
    })

    const result = await extractEntities("Paciente Pedro chegou hoje para consulta", {
      customFields: [],
      procedures: [],
    })

    expect(result.name).toBe("Pedro")
  })

  it("should throw when response has neither tool_use nor text", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [],
    })

    await expect(
      extractEntities("Paciente Maria veio para consulta odontologica", {
        customFields: [],
        procedures: [],
      })
    ).rejects.toThrow()
  })

  it("should throw when tool_use input fails schema validation", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_456",
          name: "extract_patient_data",
          input: {
            name: "Test",
            procedures: "not-an-array", // invalid
            confidence: {},
          },
        },
      ],
    })

    await expect(
      extractEntities("Paciente de teste veio para atendimento geral", {
        customFields: [],
        procedures: [],
      })
    ).rejects.toThrow("validacao de schema")
  })
})

describe("generateConsultationSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should throw on empty transcript", async () => {
    await expect(generateConsultationSummary("short", [])).rejects.toThrow(
      "Transcrição muito curta"
    )
  })

  it("should call Claude with consultation summary tool", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_789",
          name: "generate_consultation_summary",
          input: {
            procedures: ["Limpeza", "Restauracao"],
            observations: "Carie no dente 36",
            recommendations: "Retorno em 6 meses",
            nextAppointment: "2024-06-15",
          },
        },
      ],
    })

    const result = await generateConsultationSummary(
      "Realizei limpeza e restauracao no dente 36 do paciente",
      [{ id: "p1", name: "Limpeza" }, { id: "p2", name: "Restauracao" }]
    )

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.temperature).toBe(0)
    expect(callArgs.tools[0].name).toBe("generate_consultation_summary")

    expect(result.procedures).toEqual(["Limpeza", "Restauracao"])
    expect(result.observations).toBe("Carie no dente 36")
  })
})

describe("generateWorkspaceSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should call Claude with workspace config tool", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_abc",
          name: "generate_workspace_config",
          input: {
            procedures: [{ id: "p1", name: "Limpeza", category: "Preventivo" }],
            customFields: [{ id: "f1", name: "Convenio", type: "text", required: false }],
            anamnesisTemplate: [{ id: "a1", question: "Alergias?", type: "text" }],
            categories: [{ id: "c1", name: "Preventivo" }],
          },
        },
      ],
    })

    const result = await generateWorkspaceSuggestions("dentista", { especialidade: "ortodontia" })

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.tools[0].name).toBe("generate_workspace_config")
    expect(callArgs.tool_choice).toEqual({ type: "tool", name: "generate_workspace_config" })

    expect(result.procedures).toHaveLength(1)
    expect(result.categories).toHaveLength(1)
  })
})
