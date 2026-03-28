import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont, degrees } from "pdf-lib"

export interface PrescriptionPdfData {
  clinicName: string
  profession: string
  patientName: string
  patientCpf?: string
  date: Date
  medications: Array<{
    name: string
    dosage?: string
    frequency?: string
    duration?: string
    instructions?: string
  }>
  notes?: string
  doctorName: string
  doctorProfession?: string
  type: "simple" | "special_control" | "antimicrobial" | "manipulated"
  verificationUrl?: string
}

// A4 dimensions in points
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

// Colors
const TEAL = rgb(0.078, 0.722, 0.651) // #14B8A6
const GRAY_900 = rgb(0.11, 0.11, 0.11)
const GRAY_600 = rgb(0.42, 0.42, 0.42)
const GRAY_400 = rgb(0.62, 0.62, 0.62)
const GRAY_200 = rgb(0.88, 0.88, 0.88)
const GRAY_100 = rgb(0.94, 0.94, 0.94)
const AMBER_BG = rgb(1.0, 0.98, 0.92)
const AMBER_BORDER = rgb(0.92, 0.86, 0.62)
const AMBER_TEXT = rgb(0.71, 0.55, 0.14)
const WHITE = rgb(1, 1, 1)

const MARGIN_X = 50
const CONTENT_WIDTH = A4_WIDTH - MARGIN_X * 2

function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/** Truncate text to fit within a max width, adding "..." if needed */
function truncateText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated + "...", size) > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + "..."
}

/** Split text into lines that fit within maxWidth */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines.length ? lines : [""]
}

function drawWatermark(page: PDFPage, font: PDFFont, type: string) {
  if (type !== "special_control" && type !== "antimicrobial") return

  const label = type === "special_control" ? "CONTROLE ESPECIAL" : "ANTIMICROBIANO"

  page.drawText(label, {
    x: A4_WIDTH / 2 - 160,
    y: A4_HEIGHT / 2 + 40,
    size: 48,
    font,
    color: rgb(0.9, 0.9, 0.9),
    rotate: degrees(45),
    opacity: 0.3,
  })
}

export async function generatePrescriptionPdf(data: PrescriptionPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const page = doc.addPage([A4_WIDTH, A4_HEIGHT])
  let y = A4_HEIGHT

  // ── Watermark (behind everything) ──
  drawWatermark(page, helveticaBold, data.type)

  // ── Header: Teal accent bar ──
  page.drawRectangle({
    x: 0,
    y: A4_HEIGHT - 6,
    width: A4_WIDTH,
    height: 6,
    color: TEAL,
  })
  y -= 6

  // ── Header: Clinic name + profession ──
  y -= 30
  page.drawText(data.clinicName, {
    x: MARGIN_X,
    y,
    size: 18,
    font: helveticaBold,
    color: GRAY_900,
  })

  // Right side: prescription type label
  const typeLabel = "Prescricao Medica"
  const typeLabelWidth = helveticaBold.widthOfTextAtSize(typeLabel, 9)
  page.drawText(typeLabel, {
    x: A4_WIDTH - MARGIN_X - typeLabelWidth,
    y: y + 6,
    size: 9,
    font: helveticaBold,
    color: TEAL,
  })

  y -= 16
  page.drawText(data.profession, {
    x: MARGIN_X,
    y,
    size: 12,
    font: helvetica,
    color: GRAY_600,
  })

  const dateStr = formatDateLong(data.date)
  const dateWidth = helvetica.widthOfTextAtSize(dateStr, 9)
  page.drawText(dateStr, {
    x: A4_WIDTH - MARGIN_X - dateWidth,
    y,
    size: 9,
    font: helvetica,
    color: GRAY_400,
  })

  // Divider line
  y -= 16
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: A4_WIDTH - MARGIN_X, y },
    thickness: 1.5,
    color: GRAY_200,
  })

  // ── Patient info strip (gray background) ──
  const stripHeight = 48
  y -= stripHeight
  page.drawRectangle({
    x: 0,
    y,
    width: A4_WIDTH,
    height: stripHeight,
    color: GRAY_100,
  })
  // Border lines for strip
  page.drawLine({
    start: { x: 0, y: y + stripHeight },
    end: { x: A4_WIDTH, y: y + stripHeight },
    thickness: 0.5,
    color: GRAY_200,
  })
  page.drawLine({
    start: { x: 0, y },
    end: { x: A4_WIDTH, y },
    thickness: 0.5,
    color: GRAY_200,
  })

  // Patient label + value
  const stripTextY = y + 26
  const stripValueY = y + 12

  page.drawText("PACIENTE", {
    x: MARGIN_X,
    y: stripTextY,
    size: 8,
    font: helveticaBold,
    color: GRAY_400,
  })
  page.drawText(truncateText(data.patientName, helveticaBold, 11, 200), {
    x: MARGIN_X,
    y: stripValueY,
    size: 11,
    font: helveticaBold,
    color: GRAY_900,
  })

  // CPF
  if (data.patientCpf) {
    const cpfX = MARGIN_X + 220
    page.drawText("CPF", {
      x: cpfX,
      y: stripTextY,
      size: 8,
      font: helveticaBold,
      color: GRAY_400,
    })
    page.drawText(data.patientCpf, {
      x: cpfX,
      y: stripValueY,
      size: 11,
      font: helveticaBold,
      color: GRAY_900,
    })
  }

  // Date (right aligned)
  const dateBR = formatDateBR(data.date)
  const dateLabelWidth = helveticaBold.widthOfTextAtSize("DATA", 8)
  const dateValueWidth = helveticaBold.widthOfTextAtSize(dateBR, 11)
  const dateX = A4_WIDTH - MARGIN_X - Math.max(dateLabelWidth, dateValueWidth)
  page.drawText("DATA", {
    x: dateX,
    y: stripTextY,
    size: 8,
    font: helveticaBold,
    color: GRAY_400,
  })
  page.drawText(dateBR, {
    x: dateX,
    y: stripValueY,
    size: 11,
    font: helveticaBold,
    color: GRAY_900,
  })

  // ── Medications list ──
  y -= 24

  for (let i = 0; i < data.medications.length; i++) {
    const med = data.medications[i]

    // Check if we need a new page
    if (y < 160) {
      // Not enough space; in practice we'd add a new page.
      // For now, we continue on the same page (most prescriptions fit in 1 page).
    }

    // Number circle (simulated with filled circle + number)
    const circleX = MARGIN_X + 10
    const circleY = y - 4
    page.drawCircle({
      x: circleX,
      y: circleY,
      size: 10,
      color: rgb(0.94, 0.99, 0.98), // teal-50
      borderColor: rgb(0.78, 0.93, 0.90), // teal-200
      borderWidth: 0.5,
    })
    const numStr = String(i + 1)
    const numWidth = helveticaBold.widthOfTextAtSize(numStr, 9)
    page.drawText(numStr, {
      x: circleX - numWidth / 2,
      y: circleY - 3,
      size: 9,
      font: helveticaBold,
      color: TEAL,
    })

    // Medication name
    const medTextX = MARGIN_X + 30
    const medMaxWidth = CONTENT_WIDTH - 30
    page.drawText(truncateText(med.name, helveticaBold, 14, medMaxWidth), {
      x: medTextX,
      y,
      size: 14,
      font: helveticaBold,
      color: GRAY_900,
    })

    y -= 18

    // Details line: Dose | Freq | Duration
    const details: string[] = []
    if (med.dosage) details.push(`Dose: ${med.dosage}`)
    if (med.frequency) details.push(`Freq: ${med.frequency}`)
    if (med.duration) details.push(`Duracao: ${med.duration}`)

    if (details.length > 0) {
      const detailText = details.join("  |  ")
      page.drawText(truncateText(detailText, helvetica, 10, medMaxWidth), {
        x: medTextX,
        y,
        size: 10,
        font: helvetica,
        color: GRAY_600,
      })
      y -= 14
    }

    // Instructions (wrapped)
    if (med.instructions) {
      const instrLines = wrapText(med.instructions, helvetica, 10, medMaxWidth)
      for (const line of instrLines) {
        page.drawText(line, {
          x: medTextX,
          y,
          size: 10,
          font: helvetica,
          color: GRAY_600,
        })
        y -= 13
      }
    }

    // Separator line (dashed simulated with thin gray line)
    if (i < data.medications.length - 1) {
      y -= 4
      page.drawLine({
        start: { x: medTextX, y },
        end: { x: A4_WIDTH - MARGIN_X, y },
        thickness: 0.5,
        color: GRAY_200,
        dashArray: [4, 3],
      })
      y -= 12
    } else {
      y -= 8
    }
  }

  // ── Notes section ──
  if (data.notes) {
    y -= 12
    const noteLines = wrapText(data.notes, helvetica, 10, CONTENT_WIDTH - 30)
    const boxHeight = 30 + noteLines.length * 14
    const boxY = y - boxHeight

    // Yellow background box
    page.drawRectangle({
      x: MARGIN_X,
      y: boxY,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: AMBER_BG,
      borderColor: AMBER_BORDER,
      borderWidth: 0.5,
    })

    // "OBSERVACOES" header
    page.drawText("OBSERVACOES", {
      x: MARGIN_X + 14,
      y: boxY + boxHeight - 18,
      size: 9,
      font: helveticaBold,
      color: AMBER_TEXT,
    })

    // Note text
    let noteY = boxY + boxHeight - 34
    for (const line of noteLines) {
      page.drawText(line, {
        x: MARGIN_X + 14,
        y: noteY,
        size: 10,
        font: helvetica,
        color: GRAY_600,
      })
      noteY -= 14
    }

    y = boxY - 8
  }

  // ── Signature block ──
  // Position near bottom but above footer
  const sigY = Math.min(y - 30, 140)

  // Horizontal line
  const sigLineX = A4_WIDTH / 2 - 100
  const sigLineEndX = A4_WIDTH / 2 + 100
  page.drawLine({
    start: { x: sigLineX, y: sigY },
    end: { x: sigLineEndX, y: sigY },
    thickness: 1.2,
    color: GRAY_900,
  })

  // Doctor name (centered)
  const docNameWidth = helveticaBold.widthOfTextAtSize(data.doctorName, 11)
  page.drawText(data.doctorName, {
    x: A4_WIDTH / 2 - docNameWidth / 2,
    y: sigY - 16,
    size: 11,
    font: helveticaBold,
    color: GRAY_900,
  })

  // Doctor profession (centered)
  const docProf = data.doctorProfession ?? data.profession
  const docProfWidth = helvetica.widthOfTextAtSize(docProf, 9)
  page.drawText(docProf, {
    x: A4_WIDTH / 2 - docProfWidth / 2,
    y: sigY - 30,
    size: 9,
    font: helvetica,
    color: GRAY_600,
  })

  // ── Footer ──
  const footerY = 36

  // Divider
  page.drawLine({
    start: { x: MARGIN_X, y: footerY + 12 },
    end: { x: A4_WIDTH - MARGIN_X, y: footerY + 12 },
    thickness: 0.5,
    color: GRAY_200,
  })

  const footerText = `Documento gerado pelo VoxClinic em ${formatDateLong(data.date)}`
  page.drawText(footerText, {
    x: MARGIN_X,
    y: footerY,
    size: 8,
    font: helvetica,
    color: GRAY_400,
  })

  // QR code placeholder (right side)
  const qrSize = 40
  const qrX = A4_WIDTH - MARGIN_X - qrSize
  const qrY = footerY - 8
  page.drawRectangle({
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
    borderColor: GRAY_200,
    borderWidth: 0.5,
    color: WHITE,
  })
  const qrLabel = "QR"
  const qrLabelWidth = helvetica.widthOfTextAtSize(qrLabel, 7)
  page.drawText(qrLabel, {
    x: qrX + qrSize / 2 - qrLabelWidth / 2,
    y: qrY + qrSize / 2 - 3,
    size: 7,
    font: helvetica,
    color: GRAY_400,
  })

  // "VOXCLINIC" branding (right of footer text, left of QR)
  const brandText = "VOXCLINIC"
  const brandWidth = helveticaBold.widthOfTextAtSize(brandText, 8)
  page.drawText(brandText, {
    x: qrX - brandWidth - 16,
    y: footerY,
    size: 8,
    font: helveticaBold,
    color: GRAY_400,
  })

  return doc.save()
}
