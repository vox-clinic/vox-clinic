import { describe, it, expect } from "vitest"

// ============================================================
// Business rule functions extracted from the codebase.
// We re-implement the pure logic here to test it in isolation,
// mirroring the exact implementations found in server actions.
// ============================================================

// From src/server/actions/voice.ts
function normalizeCpf(doc: string): string {
  return doc.replace(/\D/g, "")
}

function formatCpf(cpf: string): string {
  const digits = normalizeCpf(cpf)
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

// From src/server/actions/appointment.ts — conflict detection logic
function checkConflict(
  existingDate: Date,
  newDate: Date,
  windowMinutes: number = 30
): boolean {
  const windowMs = windowMinutes * 60 * 1000
  const windowStart = new Date(newDate.getTime() - windowMs)
  const windowEnd = new Date(newDate.getTime() + windowMs)
  return existingDate >= windowStart && existingDate <= windowEnd
}

// From src/server/actions/document.ts
const allowedDocumentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

function isDocumentTypeAllowed(mimeType: string): boolean {
  return allowedDocumentTypes.includes(mimeType)
}

function getDocumentType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf") return "pdf"
  return "other"
}

// From src/server/actions/document.ts — 10MB for documents
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024

// From src/server/actions/voice.ts / consultation.ts — 25MB for audio
const MAX_AUDIO_SIZE = 25 * 1024 * 1024

function isFileSizeValid(size: number, maxSize: number): boolean {
  return size <= maxSize
}

// Treatment plan completion logic
function isTreatmentComplete(
  completedSessions: number,
  totalSessions: number
): boolean {
  return completedSessions >= totalSessions
}

// Duplicate patient detection logic
function isCpfDuplicate(cpf1: string, cpf2: string): boolean {
  return normalizeCpf(cpf1) === normalizeCpf(cpf2)
}

function isNamePotentialDuplicate(name1: string, name2: string): boolean {
  return name1.toLowerCase().includes(name2.toLowerCase()) ||
    name2.toLowerCase().includes(name1.toLowerCase())
}

// ============================================================
// Tests
// ============================================================

describe("CPF Normalization", () => {
  it("removes dots and dash from formatted CPF", () => {
    expect(normalizeCpf("123.456.789-00")).toBe("12345678900")
  })

  it("returns same string if already normalized", () => {
    expect(normalizeCpf("12345678900")).toBe("12345678900")
  })

  it("handles partial formatting", () => {
    expect(normalizeCpf("123.456789-00")).toBe("12345678900")
  })

  it("handles empty string", () => {
    expect(normalizeCpf("")).toBe("")
  })

  it("strips any non-digit character", () => {
    expect(normalizeCpf("abc123def456")).toBe("123456")
  })
})

describe("CPF Formatting", () => {
  it("formats 11-digit string as CPF", () => {
    expect(formatCpf("12345678900")).toBe("123.456.789-00")
  })

  it("formats already-formatted CPF (normalizes first)", () => {
    expect(formatCpf("123.456.789-00")).toBe("123.456.789-00")
  })

  it("returns original string if not 11 digits", () => {
    expect(formatCpf("12345")).toBe("12345")
  })
})

describe("Appointment Conflict Detection", () => {
  it("detects conflict when appointments are within 30min window", () => {
    const existing = new Date("2026-03-26T14:00:00Z")
    const proposed = new Date("2026-03-26T14:20:00Z")
    expect(checkConflict(existing, proposed)).toBe(true)
  })

  it("detects conflict at exact same time", () => {
    const existing = new Date("2026-03-26T14:00:00Z")
    const proposed = new Date("2026-03-26T14:00:00Z")
    expect(checkConflict(existing, proposed)).toBe(true)
  })

  it("detects conflict at exactly 30 minutes (boundary)", () => {
    const existing = new Date("2026-03-26T14:30:00Z")
    const proposed = new Date("2026-03-26T14:00:00Z")
    expect(checkConflict(existing, proposed)).toBe(true)
  })

  it("no conflict when appointments are 31 minutes apart", () => {
    const existing = new Date("2026-03-26T14:31:00Z")
    const proposed = new Date("2026-03-26T14:00:00Z")
    expect(checkConflict(existing, proposed)).toBe(false)
  })

  it("detects conflict when existing is before proposed within window", () => {
    const existing = new Date("2026-03-26T13:45:00Z")
    const proposed = new Date("2026-03-26T14:00:00Z")
    expect(checkConflict(existing, proposed)).toBe(true)
  })

  it("no conflict on different days", () => {
    const existing = new Date("2026-03-25T14:00:00Z")
    const proposed = new Date("2026-03-26T14:00:00Z")
    expect(checkConflict(existing, proposed)).toBe(false)
  })

  it("supports custom window size", () => {
    const existing = new Date("2026-03-26T14:45:00Z")
    const proposed = new Date("2026-03-26T14:00:00Z")
    // 30min window: no conflict
    expect(checkConflict(existing, proposed, 30)).toBe(false)
    // 60min window: conflict
    expect(checkConflict(existing, proposed, 60)).toBe(true)
  })
})

describe("Audio File Size Validation", () => {
  it("accepts file under 25MB", () => {
    expect(isFileSizeValid(10 * 1024 * 1024, MAX_AUDIO_SIZE)).toBe(true)
  })

  it("accepts file exactly at 25MB", () => {
    expect(isFileSizeValid(25 * 1024 * 1024, MAX_AUDIO_SIZE)).toBe(true)
  })

  it("rejects file over 25MB", () => {
    expect(isFileSizeValid(26 * 1024 * 1024, MAX_AUDIO_SIZE)).toBe(false)
  })

  it("accepts zero-byte file", () => {
    expect(isFileSizeValid(0, MAX_AUDIO_SIZE)).toBe(true)
  })
})

describe("Document File Size Validation", () => {
  it("accepts file under 10MB", () => {
    expect(isFileSizeValid(5 * 1024 * 1024, MAX_DOCUMENT_SIZE)).toBe(true)
  })

  it("rejects file over 10MB", () => {
    expect(isFileSizeValid(11 * 1024 * 1024, MAX_DOCUMENT_SIZE)).toBe(false)
  })
})

describe("Document MIME Type Validation", () => {
  it("allows image/jpeg", () => {
    expect(isDocumentTypeAllowed("image/jpeg")).toBe(true)
  })

  it("allows image/png", () => {
    expect(isDocumentTypeAllowed("image/png")).toBe(true)
  })

  it("allows image/webp", () => {
    expect(isDocumentTypeAllowed("image/webp")).toBe(true)
  })

  it("allows image/gif", () => {
    expect(isDocumentTypeAllowed("image/gif")).toBe(true)
  })

  it("allows application/pdf", () => {
    expect(isDocumentTypeAllowed("application/pdf")).toBe(true)
  })

  it("allows MS Word doc", () => {
    expect(isDocumentTypeAllowed("application/msword")).toBe(true)
  })

  it("allows MS Word docx", () => {
    expect(
      isDocumentTypeAllowed(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(true)
  })

  it("rejects text/plain", () => {
    expect(isDocumentTypeAllowed("text/plain")).toBe(false)
  })

  it("rejects application/zip", () => {
    expect(isDocumentTypeAllowed("application/zip")).toBe(false)
  })

  it("rejects video/mp4", () => {
    expect(isDocumentTypeAllowed("video/mp4")).toBe(false)
  })

  it("rejects empty string", () => {
    expect(isDocumentTypeAllowed("")).toBe(false)
  })
})

describe("Document Type Classification", () => {
  it("classifies image/* as image", () => {
    expect(getDocumentType("image/jpeg")).toBe("image")
    expect(getDocumentType("image/png")).toBe("image")
    expect(getDocumentType("image/webp")).toBe("image")
  })

  it("classifies application/pdf as pdf", () => {
    expect(getDocumentType("application/pdf")).toBe("pdf")
  })

  it("classifies other types as other", () => {
    expect(getDocumentType("application/msword")).toBe("other")
    expect(getDocumentType("text/plain")).toBe("other")
  })
})

describe("Treatment Plan Completion", () => {
  it("is complete when completedSessions equals totalSessions", () => {
    expect(isTreatmentComplete(10, 10)).toBe(true)
  })

  it("is complete when completedSessions exceeds totalSessions", () => {
    expect(isTreatmentComplete(12, 10)).toBe(true)
  })

  it("is not complete when completedSessions is less than totalSessions", () => {
    expect(isTreatmentComplete(5, 10)).toBe(false)
  })

  it("is complete when both are 0", () => {
    expect(isTreatmentComplete(0, 0)).toBe(true)
  })

  it("is not complete at 0 of 1", () => {
    expect(isTreatmentComplete(0, 1)).toBe(false)
  })
})

describe("Patient Duplicate Detection", () => {
  describe("CPF-based", () => {
    it("detects duplicate with identical formatted CPFs", () => {
      expect(isCpfDuplicate("123.456.789-00", "123.456.789-00")).toBe(true)
    })

    it("detects duplicate with formatted vs unformatted CPF", () => {
      expect(isCpfDuplicate("123.456.789-00", "12345678900")).toBe(true)
    })

    it("detects duplicate with both unformatted", () => {
      expect(isCpfDuplicate("12345678900", "12345678900")).toBe(true)
    })

    it("not duplicate with different CPFs", () => {
      expect(isCpfDuplicate("123.456.789-00", "987.654.321-00")).toBe(false)
    })
  })

  describe("Name-based (case-insensitive contains)", () => {
    it("detects potential duplicate with exact match", () => {
      expect(isNamePotentialDuplicate("Joao Silva", "Joao Silva")).toBe(true)
    })

    it("detects potential duplicate case-insensitive", () => {
      expect(isNamePotentialDuplicate("JOAO SILVA", "joao silva")).toBe(true)
    })

    it("detects potential duplicate with partial name", () => {
      expect(isNamePotentialDuplicate("Joao Silva Santos", "Joao Silva")).toBe(
        true
      )
    })

    it("no duplicate with completely different names", () => {
      expect(isNamePotentialDuplicate("Joao Silva", "Maria Santos")).toBe(false)
    })
  })
})
