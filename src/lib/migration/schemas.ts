import { z } from "zod"

export const MigrationPatientSchema = z.object({
  externalId: z.string().nullable(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  document: z.string().nullable(),
  rg: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email("Email invalido").nullable().or(z.literal("")),
  birthDate: z.string().nullable(),
  gender: z.enum(["masculino", "feminino", "outro", "nao_informado"]).nullable(),
  address: z.object({
    street: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
    complement: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zipCode: z.string().nullable().optional(),
  }).nullable(),
  insurance: z.string().nullable(),
  guardian: z.string().nullable(),
  source: z.enum(["instagram", "google", "indicacao", "convenio", "site", "facebook", "outro"]).nullable(),
  tags: z.array(z.string()),
  medicalHistory: z.object({
    allergies: z.array(z.string()).optional(),
    chronicDiseases: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    bloodType: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  }),
  customData: z.record(z.string(), z.unknown()),
  alerts: z.array(z.string()),
})

export const MigrationAppointmentSchema = z.object({
  externalId: z.string().nullable(),
  patientExternalId: z.string().nullable(),
  patientDocument: z.string().nullable(),
  patientName: z.string().nullable(),
  date: z.string().min(1, "Data da consulta e obrigatoria"),
  procedures: z.array(z.string()),
  notes: z.string().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
  price: z.number().nullable(),
})
