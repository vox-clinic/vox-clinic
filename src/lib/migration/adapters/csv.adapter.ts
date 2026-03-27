import type {
  MigrationAdapter,
  MigrationAdapterConfig,
  MigrationAdapterResult,
  MigrationError,
  MigrationPatient,
  MigrationSource,
} from "../types"

// Header aliases for auto-mapping (lowercased, trimmed)
// Supports both Portuguese and English column names from various clinic systems
const PATIENT_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "paciente", "nome completo", "nome_completo", "patient", "patientname", "patient_name", "patient name", "fullname", "full_name", "full name", "clientname", "client name", "client"],
  document: ["cpf", "documento", "document", "cpf/cnpj", "cpf_cnpj", "tax_id", "taxid", "ssn"],
  rg: ["rg", "identidade", "id_number"],
  phone: ["telefone", "phone", "celular", "tel", "whatsapp", "fone", "mobile", "mobilephone", "mobile_phone", "cellphone", "cell_phone", "homephone", "home_phone", "phonenumber", "phone_number"],
  email: ["email", "e-mail", "emailaddress", "email_address"],
  birthDate: ["data de nascimento", "nascimento", "birthdate", "dt_nascimento", "data_nascimento", "dt nascimento", "birth_date", "birth date", "dateofbirth", "date_of_birth", "dob", "birthday"],
  gender: ["sexo", "genero", "gender", "sex"],
  insurance: ["convenio", "plano", "insurance", "plano de saude", "healthplan", "health_plan", "health plan", "insurancename", "insurance_name"],
  guardian: ["responsavel", "guardian", "mae", "pai", "parent", "responsible"],
  source: ["origem", "source", "como conheceu", "indicacao", "referral", "referralsource", "referral_source", "how_found"],
  tags: ["tags", "etiquetas", "categorias", "labels", "categories"],
  "address.street": ["rua", "endereco", "logradouro", "street", "address", "streetaddress", "street_address", "address1", "address_1"],
  "address.number": ["numero", "number", "num", "nro", "addressnumber", "address_number", "streetnumber"],
  "address.complement": ["complemento", "complement", "apto", "apartamento", "unit", "suite", "address2", "address_2"],
  "address.neighborhood": ["bairro", "neighborhood", "district", "area"],
  "address.city": ["cidade", "city", "municipio", "town"],
  "address.state": ["estado", "state", "uf", "province", "region"],
  "address.zipCode": ["cep", "zip", "zipcode", "codigo postal", "zip_code", "postalcode", "postal_code", "postal code"],
}

const APPOINTMENT_ALIASES: Record<string, string[]> = {
  "appt.patientName": ["patientname", "patient_name", "patient name", "patient", "nome do paciente", "paciente", "nome", "name", "clientname", "client_name", "client name"],
  "appt.patientDocument": ["patientcpf", "patient_cpf", "cpf", "documento", "document", "cpf_cnpj"],
  "appt.patientPhone": ["patientphone", "patient_phone", "telefone", "phone", "celular"],
  "appt.patientEmail": ["patientemail", "patient_email", "email", "e-mail"],
  "appt.date": ["date", "data", "appointmentdate", "appointment_date", "appointment date", "startdate", "start_date", "start date", "createdate", "create_date", "create date", "scheduledate", "schedule_date", "data da consulta", "data consulta", "dt_consulta", "starttime", "start_time", "datetime", "date_time"],
  "appt.endDate": ["enddate", "end_date", "end date", "endtime", "end_time"],
  "appt.procedures": ["procedure", "procedures", "procedimento", "procedimentos", "service", "services", "servico", "servicos", "treatment", "treatments", "tratamento", "categorydescription", "category_description", "category description", "category", "categoria", "tipo", "type", "appointmenttype", "appointment_type", "appointment type", "servicename", "service_name"],
  "appt.notes": ["notes", "notas", "observacoes", "observacao", "obs", "description", "descricao", "comments", "comentarios", "note", "memo"],
  "appt.status": ["status", "appointmentstatus", "appointment_status", "estado", "situacao"],
  "appt.price": ["price", "preco", "valor", "value", "amount", "fee", "cost", "custo", "totalprice", "total_price", "total"],
  "appt.cancelled": ["cancelled", "canceled", "cancelado", "cancelada"],
  "appt.cancelReason": ["cancelreason", "cancel_reason", "cancel reason", "motivocancelamento", "motivo_cancelamento", "cancellationreason"],
  "appt.provider": ["provider", "profissional", "doctor", "medico", "dentista", "dentist", "providername", "provider_name"],
  "appt.duration": ["duration", "duracao", "minutes", "minutos", "durationminutes", "duration_minutes"],
}

// Combined aliases for auto-detection
const FIELD_ALIASES: Record<string, string[]> = { ...PATIENT_ALIASES, ...APPOINTMENT_ALIASES }

// Detect if file is primarily appointments or patients based on column names
export function detectDataType(headers: string[]): "patients" | "appointments" | "mixed" {
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[_\-\s]+/g, ""))

  const appointmentSignals = ["date", "appointmentdate", "startdate", "createdate", "procedure", "procedures", "categorydescription", "status", "cancelled", "canceled", "appointmenttype", "duration", "provider", "enddate", "starttime"]
  const patientSignals = ["cpf", "rg", "birthdate", "dateofbirth", "gender", "sexo", "insurance", "convenio", "address", "cep", "bairro"]

  const apptCount = normalized.filter((h) => appointmentSignals.some((s) => h.includes(s))).length
  const patientCount = normalized.filter((h) => patientSignals.some((s) => h.includes(s))).length

  if (apptCount >= 3 && apptCount > patientCount) return "appointments"
  if (patientCount >= 2 && patientCount > apptCount) return "patients"
  if (apptCount >= 1 && patientCount >= 1) return "mixed"
  if (apptCount >= 1) return "appointments"
  return "patients"
}

/**
 * Auto-detect column mappings from CSV header names.
 * Returns a map of csvColumn -> field and the detected data type.
 */
export function autoMapColumns(
  headers: string[]
): { mapping: Record<string, string>; dataType: "patients" | "appointments" | "mixed" } {
  const mapping: Record<string, string> = {}
  const usedFields = new Set<string>()
  const dataType = detectDataType(headers)

  // Choose which alias set to prioritize based on detected type
  const primaryAliases = dataType === "patients" ? PATIENT_ALIASES : APPOINTMENT_ALIASES
  const secondaryAliases = dataType === "patients" ? APPOINTMENT_ALIASES : PATIENT_ALIASES

  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[_\-\s]+/g, " ")

    // Try primary aliases first
    let found = false
    for (const [field, aliases] of Object.entries(primaryAliases)) {
      if (usedFields.has(field)) continue
      if (aliases.some((a) => normalized === a || normalized.replace(/\s+/g, "") === a.replace(/\s+/g, ""))) {
        mapping[header] = field
        usedFields.add(field)
        found = true
        break
      }
    }

    // Then secondary aliases
    if (!found) {
      for (const [field, aliases] of Object.entries(secondaryAliases)) {
        if (usedFields.has(field)) continue
        if (aliases.some((a) => normalized === a || normalized.replace(/\s+/g, "") === a.replace(/\s+/g, ""))) {
          mapping[header] = field
          usedFields.add(field)
          break
        }
      }
    }
  }

  return { mapping, dataType }
}

function splitCommaSeparated(value: string | undefined | null): string[] {
  if (!value || !value.trim()) return []
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function strOrNull(value: string | undefined | null): string | null {
  if (!value || !value.trim()) return null
  return value.trim()
}

export class CsvAdapter implements MigrationAdapter {
  readonly source: MigrationSource = "csv"

  validateConfig(config: MigrationAdapterConfig): MigrationError[] {
    const errors: MigrationError[] = []

    if (!config.columnMapping || Object.keys(config.columnMapping).length === 0) {
      errors.push({
        phase: "parse",
        severity: "fatal",
        sourceRow: null,
        field: null,
        message: "columnMapping is required and must not be empty",
      })
      return errors
    }

    const mappedFields = Object.values(config.columnMapping)
    const hasPatientName = mappedFields.includes("name") || mappedFields.includes("appt.patientName")
    const hasAppointmentDate = mappedFields.includes("appt.date")

    if (!hasPatientName) {
      errors.push({
        phase: "parse",
        severity: "fatal",
        sourceRow: null,
        field: "name",
        message: 'E necessario mapear pelo menos o campo "Nome do Paciente"',
      })
    }

    return errors
  }

  async parse(
    data: unknown,
    config: MigrationAdapterConfig
  ): Promise<MigrationAdapterResult> {
    const patients: MigrationPatient[] = []
    const errors: MigrationError[] = []

    // Validate config first
    const configErrors = this.validateConfig(config)
    if (configErrors.some((e) => e.severity === "fatal")) {
      return { patients, appointments: [], errors: configErrors }
    }
    errors.push(...configErrors)

    const rows = data as Record<string, string>[]
    if (!Array.isArray(rows)) {
      errors.push({
        phase: "parse",
        severity: "fatal",
        sourceRow: null,
        field: null,
        message: "Data must be an array of row objects",
      })
      return { patients, appointments: [], errors }
    }

    // Invert mapping: patientField -> csvColumn
    const mapping = config.columnMapping!
    const fieldToColumn: Record<string, string> = {}
    for (const [csvCol, patientField] of Object.entries(mapping)) {
      fieldToColumn[patientField] = csvCol
    }

    const getValue = (row: Record<string, string>, field: string): string | undefined => {
      const col = fieldToColumn[field]
      if (!col) return undefined
      return row[col]
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const sourceRow = i + 1 // 1-indexed

      try {
        const name = strOrNull(getValue(row, "name"))

        if (!name) {
          errors.push({
            phase: "normalize",
            severity: "error",
            sourceRow,
            field: "name",
            message: "Name is empty or missing, skipping row",
            value: getValue(row, "name") ?? null,
          })
          continue
        }

        // Build address
        const street = strOrNull(getValue(row, "address.street"))
        const number = strOrNull(getValue(row, "address.number"))
        const complement = strOrNull(getValue(row, "address.complement"))
        const neighborhood = strOrNull(getValue(row, "address.neighborhood"))
        const city = strOrNull(getValue(row, "address.city"))
        const state = strOrNull(getValue(row, "address.state"))
        const zipCode = strOrNull(getValue(row, "address.zipCode"))

        const hasAddress = street || number || complement || neighborhood || city || state || zipCode
        const address = hasAddress
          ? { street, number, complement, neighborhood, city, state, zipCode }
          : null

        // Build medicalHistory
        const allergies = splitCommaSeparated(getValue(row, "medicalHistory.allergies"))
        const chronicDiseases = splitCommaSeparated(getValue(row, "medicalHistory.chronicDiseases"))
        const medications = splitCommaSeparated(getValue(row, "medicalHistory.medications"))
        const bloodType = strOrNull(getValue(row, "medicalHistory.bloodType"))
        const medicalNotes = strOrNull(getValue(row, "medicalHistory.notes"))

        const patient: MigrationPatient = {
          externalId: null,
          name,
          document: strOrNull(getValue(row, "document")),
          rg: strOrNull(getValue(row, "rg")),
          phone: strOrNull(getValue(row, "phone")),
          email: strOrNull(getValue(row, "email")),
          birthDate: strOrNull(getValue(row, "birthDate")),
          gender: strOrNull(getValue(row, "gender")),
          address,
          insurance: strOrNull(getValue(row, "insurance")),
          guardian: strOrNull(getValue(row, "guardian")),
          source: strOrNull(getValue(row, "source")),
          tags: splitCommaSeparated(getValue(row, "tags")),
          medicalHistory: {
            allergies,
            chronicDiseases,
            medications,
            bloodType,
            notes: medicalNotes,
          },
          customData: {},
          alerts: [],
          _meta: {
            sourceRow,
            rawData: { ...row },
          },
        }

        patients.push(patient)
      } catch (err) {
        errors.push({
          phase: "normalize",
          severity: "error",
          sourceRow,
          field: null,
          message: `Unexpected error processing row: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    }

    return { patients, appointments: [], errors }
  }
}
