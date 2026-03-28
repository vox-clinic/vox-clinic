import ExcelJS from "exceljs"

export async function generateXlsx(data: Record<string, unknown>[], sheetName: string = "Dados"): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  addSheetFromData(workbook, sheetName, data)
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

export async function generateXlsxMultiSheet(sheets: { name: string; data: Record<string, unknown>[] }[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  for (const sheet of sheets) {
    addSheetFromData(workbook, sheet.name, sheet.data)
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

function addSheetFromData(workbook: ExcelJS.Workbook, name: string, data: Record<string, unknown>[]) {
  const worksheet = workbook.addWorksheet(name)
  if (data.length === 0) return

  const keys = Object.keys(data[0])
  worksheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(key.length + 2, 15),
  }))

  for (const row of data) {
    worksheet.addRow(
      keys.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = row[key] ?? ""
        return acc
      }, {})
    )
  }
}
