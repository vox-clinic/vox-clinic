import { z } from "zod"

// Schema para extracao de dados do paciente via voz
export const ExtractedPatientDataSchema = z.object({
  name: z.string().nullable().optional().default(null),
  document: z.string().nullable().optional().default(null),
  phone: z.string().nullable().optional().default(null),
  email: z.string().nullable().optional().default(null),
  birthDate: z.string().nullable().optional().default(null),
  age: z.number().nullable().optional().default(null),
  procedures: z.array(z.string()).optional().default([]),
  notes: z.string().nullable().optional().default(null),
  alerts: z.array(z.string()).optional().default([]),
  customData: z.record(z.string(), z.any()).optional().default({}),
  confidence: z.record(z.string(), z.number()).optional().default({}),
})

export type ExtractedPatientDataParsed = z.infer<typeof ExtractedPatientDataSchema>

// Schema para configuracao do workspace gerada pela IA
export const WorkspaceConfigSchema = z.object({
  procedures: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional().default("Geral"),
  })).default([]),
  customFields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["text", "number", "boolean", "date", "select"]),
    required: z.boolean().optional().default(false),
    options: z.array(z.string()).optional(),
  })).default([]),
  anamnesisTemplate: z.array(z.object({
    id: z.string(),
    question: z.string(),
    type: z.enum(["text", "boolean", "select"]),
    options: z.array(z.string()).optional(),
  })).default([]),
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).default([]),
})

export type WorkspaceConfigParsed = z.infer<typeof WorkspaceConfigSchema>

// Schema para medicamento prescrito/mencionado na consulta
export const ConsultationMedicationSchema = z.object({
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
})

// Schema para atualizacoes de dados pessoais do paciente identificadas pela IA
export const PatientInfoUpdatesSchema = z.object({
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  insurance: z.string().nullable().optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  chronicDiseases: z.array(z.string()).optional(),
})

// Schema para resumo de consulta
export const AppointmentSummarySchema = z.object({
  procedures: z.array(z.string()).default([]),
  observations: z.string().nullable().optional().default(null),
  recommendations: z.string().nullable().optional().default(null),
  nextAppointment: z.string().nullable().optional().default(null),
  diagnosis: z.string().nullable().optional().default(null),
  medications: z.array(ConsultationMedicationSchema).optional().default([]),
  patientInfoUpdates: PatientInfoUpdatesSchema.optional().default({}),
})

export type AppointmentSummaryParsed = z.infer<typeof AppointmentSummarySchema>
