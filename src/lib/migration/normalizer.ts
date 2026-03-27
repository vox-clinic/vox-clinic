import { cpf } from "cpf-cnpj-validator"
import { parsePhoneNumberFromString } from "libphonenumber-js/min"
import { parse, isValid, format } from "date-fns"
import type { MigrationPatient, MigrationError } from "./types"

// ── CPF ────────────────────────────────────────────────────────────────

function normalizeCPF(
  value: string | null,
  sourceRow: number,
  errors: MigrationError[]
): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, "")
  if (!digits) return null

  if (!cpf.isValid(digits)) {
    errors.push({
      phase: "normalize",
      severity: "warning",
      sourceRow,
      field: "document",
      message: `CPF inválido: ${value}`,
      value,
    })
    return null
  }

  return cpf.format(digits)
}

// ── Phone ──────────────────────────────────────────────────────────────

function normalizePhone(
  value: string | null,
  sourceRow: number,
  errors: MigrationError[]
): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = parsePhoneNumberFromString(trimmed, "BR")
  if (parsed?.isValid()) {
    return parsed.format("E.164")
  }

  // Fallback: strip to digits and prepend +55
  const digits = trimmed.replace(/\D/g, "")
  if (digits) {
    const retry = parsePhoneNumberFromString(`+55${digits}`, "BR")
    if (retry?.isValid()) {
      return retry.format("E.164")
    }
  }

  errors.push({
    phase: "normalize",
    severity: "warning",
    sourceRow,
    field: "phone",
    message: `Telefone não reconhecido: ${value}`,
    value,
  })
  return trimmed
}

// ── Name ───────────────────────────────────────────────────────────────

const LOWERCASE_PARTICLES = new Set([
  "de",
  "da",
  "do",
  "dos",
  "das",
  "e",
])

function normalizeName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ")
  return trimmed
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && LOWERCASE_PARTICLES.has(lower)) {
        return lower
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

// ── Email ──────────────────────────────────────────────────────────────

function normalizeEmail(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  return trimmed || null
}

// ── Birth Date ─────────────────────────────────────────────────────────

const DATE_FORMATS = [
  "dd/MM/yyyy",
  "dd-MM-yyyy",
  "dd.MM.yyyy",
  "yyyy-MM-dd",
  "dd/MM/yy",
]

function normalizeBirthDate(
  value: string | null,
  sourceRow: number,
  errors: MigrationError[]
): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  for (const fmt of DATE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date())
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    }
  }

  errors.push({
    phase: "normalize",
    severity: "warning",
    sourceRow,
    field: "birthDate",
    message: `Data de nascimento não reconhecida: ${value}`,
    value,
  })
  return null
}

// ── Gender ─────────────────────────────────────────────────────────────

const GENDER_MAP: Record<string, string> = {
  m: "masculino",
  f: "feminino",
  masc: "masculino",
  fem: "feminino",
  masculino: "masculino",
  feminino: "feminino",
  male: "masculino",
  female: "feminino",
  h: "masculino",
  homem: "masculino",
  mulher: "feminino",
  outro: "outro",
}

function normalizeGender(value: string | null): string {
  if (!value) return "nao_informado"
  const key = value.trim().toLowerCase()
  return GENDER_MAP[key] ?? "nao_informado"
}

// ── ZIP Code ───────────────────────────────────────────────────────────

function normalizeZipCode(value: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 8) return null
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

// ── Source ──────────────────────────────────────────────────────────────

const SOURCE_MAP: Record<string, string> = {
  instagram: "instagram",
  insta: "instagram",
  ig: "instagram",
  google: "google",
  indicacao: "indicacao",
  "indicação": "indicacao",
  referral: "indicacao",
  convenio: "convenio",
  convênio: "convenio",
  plano: "convenio",
  site: "site",
  website: "site",
  web: "site",
  facebook: "facebook",
  fb: "facebook",
  outro: "outro",
  other: "outro",
}

function normalizeSource(value: string | null): string | null {
  if (!value) return null
  const key = value.trim().toLowerCase()
  return SOURCE_MAP[key] ?? "outro"
}

// ── Address ────────────────────────────────────────────────────────────

function normalizeAddress(
  addr: MigrationPatient["address"]
): MigrationPatient["address"] {
  if (!addr) return null
  return {
    street: addr.street?.trim() || null,
    number: addr.number?.trim() || null,
    complement: addr.complement?.trim() || null,
    neighborhood: addr.neighborhood?.trim() || null,
    city: addr.city?.trim() || null,
    state: addr.state?.trim().toUpperCase() || null,
    zipCode: normalizeZipCode(addr.zipCode ?? null),
  }
}

// ── Main ───────────────────────────────────────────────────────────────

function normalizePatient(
  patient: MigrationPatient,
  errors: MigrationError[]
): MigrationPatient {
  const row = patient._meta.sourceRow

  return {
    ...patient,
    name: normalizeName(patient.name),
    document: normalizeCPF(patient.document, row, errors),
    rg: patient.rg?.trim() || null,
    phone: normalizePhone(patient.phone, row, errors),
    email: normalizeEmail(patient.email),
    birthDate: normalizeBirthDate(patient.birthDate, row, errors),
    gender: normalizeGender(patient.gender),
    address: normalizeAddress(patient.address),
    insurance: patient.insurance?.trim() || null,
    guardian: patient.guardian?.trim() || null,
    source: normalizeSource(patient.source),
    tags: patient.tags.map((t) => t.trim()).filter(Boolean),
    alerts: patient.alerts.map((a) => a.trim()).filter(Boolean),
  }
}

export function normalizePatients(patients: MigrationPatient[]): {
  patients: MigrationPatient[]
  errors: MigrationError[]
} {
  const errors: MigrationError[] = []
  const normalized = patients.map((p) => normalizePatient(p, errors))
  return { patients: normalized, errors }
}
