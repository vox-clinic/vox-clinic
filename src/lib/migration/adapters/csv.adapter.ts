import type {
  MigrationAdapter,
  MigrationAdapterConfig,
  MigrationAdapterResult,
  MigrationError,
  MigrationPatient,
  MigrationSource,
} from "../types"

// Header aliases for auto-mapping (lowercased, trimmed)
const FIELD_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "paciente", "nome completo", "nome_completo"],
  document: ["cpf", "documento", "document", "cpf/cnpj"],
  rg: ["rg", "identidade"],
  phone: ["telefone", "phone", "celular", "tel", "whatsapp", "fone"],
  email: ["email", "e-mail"],
  birthDate: [
    "data de nascimento",
    "nascimento",
    "birthdate",
    "dt_nascimento",
    "data_nascimento",
    "dt nascimento",
  ],
  gender: ["sexo", "genero", "gender"],
  insurance: ["convenio", "plano", "insurance", "plano de saude"],
  guardian: ["responsavel", "guardian", "mae", "pai"],
  source: ["origem", "source", "como conheceu", "indicacao"],
  tags: ["tags", "etiquetas", "categorias"],
  "address.street": ["rua", "endereco", "logradouro", "street"],
  "address.number": ["numero", "number", "num", "nro"],
  "address.complement": ["complemento", "complement", "apto", "apartamento"],
  "address.neighborhood": ["bairro", "neighborhood"],
  "address.city": ["cidade", "city", "municipio"],
  "address.state": ["estado", "state", "uf"],
  "address.zipCode": ["cep", "zip", "zipcode", "codigo postal"],
}

/**
 * Auto-detect column mappings from CSV header names.
 * Returns a map of csvColumn -> patientField.
 */
export function autoMapColumns(
  headers: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {}
  const usedFields = new Set<string>()

  for (const header of headers) {
    const normalized = header.toLowerCase().trim()

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (usedFields.has(field)) continue
      if (aliases.includes(normalized)) {
        mapping[header] = field
        usedFields.add(field)
        break
      }
    }
  }

  return mapping
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
    if (!mappedFields.includes("name")) {
      errors.push({
        phase: "parse",
        severity: "fatal",
        sourceRow: null,
        field: "name",
        message:
          'columnMapping must include a mapping to "name" (at minimum)',
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
