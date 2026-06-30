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

// ─── Duplicate Header Detection ────────────────────────────────────────────────
// sheet_to_json keys rows by header name. Duplicate headers silently overwrite
// each other (only the last column with that name survives), corrupting data
// with no error. We detect this here and rename duplicates so nothing is lost,
// then surface a warning so the user knows their file had a naming collision.

function dedupeHeaders(rawHeaders: string[]): { headers: string[]; warnings: string[] } {
  const seen = new Map<string, number>()
  const warnings: string[] = []
  const headers = rawHeaders.map((h) => {
    const key = (h ?? '').toString().trim() || '(unnamed column)'
    const count = seen.get(key) ?? 0
    seen.set(key, count + 1)
    if (count === 0) return key
    warnings.push(`Column "${key}" appeared more than once in your file — duplicates were renamed to "${key} (${count + 1})" so no data was lost. Please verify this is intentional.`)
    return `${key} (${count + 1})`
  })
  return { headers, warnings }
}

// ─── Extended DatasetSummary ───────────────────────────────────────────────────

export type DatasetSummaryWithMeta = DatasetSummary & { skipRows: number; warnings: string[] }

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

  // Read raw header row first so we can detect/dedupe duplicate column names
  // before sheet_to_json silently collapses them.
  const headerRowRaw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
    range: skipRows,
  })[0] as unknown[] | undefined

  const warnings: string[] = []

  if (!headerRowRaw || headerRowRaw.length === 0) {
    throw new Error('The uploaded file appears to be empty or has no readable header row.')
  }

  const { headers: dedupedHeaders, warnings: headerWarnings } = dedupeHeaders(
    headerRowRaw.map((h) => String(h ?? ''))
  )
  warnings.push(...headerWarnings)

  // Read data rows using array form, then map to deduped headers ourselves —
  // this avoids relying on sheet_to_json's object-key collision behavior.
  const allRowsArray = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    range: skipRows + 1,
  })

  if (allRowsArray.length === 0) {
    throw new Error('The uploaded file appears to be empty or has no readable data.')
  }

  const dataRows: Record<string, unknown>[] = allRowsArray.map((rowArr) => {
    const row: Record<string, unknown> = {}
    dedupedHeaders.forEach((h, i) => { row[h] = (rowArr as unknown[])[i] ?? null })
    return row
  })

  const headers = dedupedHeaders
  const rowCount = dataRows.length
  const columnCount = headers.length

  if (rowCount < 5) {
    warnings.push(`This file only has ${rowCount} row${rowCount === 1 ? '' : 's'} of data. Most statistical tests need more observations to produce meaningful results.`)
  }

  const columns: ColumnInfo[] = headers.map((header) => {
    const values = dataRows.map((row) => row[header])
    const missing = values.filter((v) => v === null || v === undefined || v === '').length
    const missingPercent = Math.round((missing / Math.max(1, rowCount)) * 100 * 10) / 10
    const unique = new Set(values.filter((v) => v !== null && v !== undefined && v !== '')).size
    const sample = values
      .slice(0, 5)
      .map((v) => (v === null || v === undefined ? null : v as string | number))

    if (missingPercent >= 50) {
      warnings.push(`Column "${header}" is ${missingPercent}% empty — results involving this column may be unreliable.`)
    }

    return {
      name: header,
      cleanName: toSnakeCase(header),
      detectedType: detectType(values),
      missingCount: missing,
      missingPercent,
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
    warnings,
  }
}
