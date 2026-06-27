import * as XLSX from 'xlsx'
import type { ColumnInfo, DatasetSummary } from '@/app/types'

// ─── Type Detection ────────────────────────────────────────────────────────────

function detectType(values: unknown[]): ColumnInfo['detectedType'] {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '')
  if (nonNull.length === 0) return 'unknown'
  const datePattern = /^\d{4}[-/]\d{2}[-/]\d{2}|^\d{2}[-/]\d{2}[-/]\d{4}/
  const isDate = nonNull.every((v) => typeof v === 'string' && datePattern.test(String(v)))
  if (isDate) return 'date'
  const allNumeric = nonNull.every((v) => typeof v === 'number' || !isNaN(Number(v)))
  if (!allNumeric) return 'character'
  const allInt = nonNull.every((v) => Number(v) % 1 === 0)
  return allInt ? 'integer' : 'numeric'
}

// ─── Column Name Cleaner ───────────────────────────────────────────────────────

export function toSnakeCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1')
}

// ─── Detect Header Skip Rows ───────────────────────────────────────────────────
// Find the row with the most non-null cells — that is the real header row.
// Everything before it is title block noise.

function detectSkipRows(sheet: XLSX.WorkSheet): number {
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  })

  let bestRow = 0
  let bestCount = 0

  for (let i = 0; i < Math.min(20, allRows.length); i++) {
    const row = allRows[i] as unknown[]
    const nonNull = row.filter(
      (v) => v !== null && v !== undefined && String(v).trim() !== ''
    ).length
    if (nonNull > bestCount) {
      bestCount = nonNull
      bestRow = i
    }
  }

  return bestRow
}

// ─── Extended DatasetSummary ───────────────────────────────────────────────────

export type DatasetSummaryWithMeta = DatasetSummary & { skipRows: number }

// ─── Main Inspection Function ──────────────────────────────────────────────────

export function inspectDataset(
  buffer: Buffer,
  fileName: string,
  tempFilePath: string
): DatasetSummaryWithMeta {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Find the real header row
  const skipRows = detectSkipRows(sheet)

  // Read from the real header row onward
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
    range: skipRows,
  })

  if (rawData.length === 0) {
    throw new Error('The uploaded file appears to be empty or has no readable data.')
  }

  const headers = Object.keys(rawData[0])
  // rawData[0] is the header row itself when using range — actual data starts at index 1
  // But sheet_to_json with range uses row as header, so rawData[0] is already first data row
  const dataRows = rawData
  const rowCount = dataRows.length
  const columnCount = headers.length

  const columns: ColumnInfo[] = headers.map((header) => {
    const values = dataRows.map((row) => row[header])
    const missing = values.filter((v) => v === null || v === undefined || v === '').length
    const unique = new Set(values.filter((v) => v !== null && v !== undefined && v !== '')).size
    const sample = values
      .slice(0, 5)
      .map((v) => (v === null || v === undefined ? null : v as string | number))

    return {
      name: header,
      cleanName: toSnakeCase(header),
      detectedType: detectType(values),
      missingCount: missing,
      missingPercent: Math.round((missing / Math.max(1, rowCount)) * 100 * 10) / 10,
      uniqueCount: unique,
      sample,
    }
  })

  const preview = dataRows.slice(0, 5).map((row) => {
    const clean: Record<string, unknown> = {}
    headers.forEach((h) => { clean[h] = row[h] ?? null })
    return clean
  })

  return {
    fileName,
    rowCount,
    columnCount,
    columns,
    preview,
    uploadedAt: new Date().toISOString(),
    tempFilePath,
    skipRows,
  }
}
