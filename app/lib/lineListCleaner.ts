// Client-side only. All operations run in the browser on raw row data.
// This file is never imported by any API route — PHI stays on the device.

import type { DataSource } from './sourceDetector'

export type CleaningStepType =
  | 'remove_columns'
  | 'standardize_values'
  | 'fix_dates'
  | 'remove_test_rows'
  | 'rename_columns'
  | 'merge_multichoice'
  | 'convert_age'
  | 'correct_date'
  | 'deduplicate'
  | 'fill_missing'
  | 'remove_rows'
  | 'convert_type'

export interface CleaningStep {
  id: string
  type: CleaningStepType
  title: string
  description: string
  detail: string
  status: 'pending' | 'accepted' | 'skipped' | 'applied'
  payload: Record<string, unknown>
}

export type RawRow = Record<string, unknown>

// ─── AI suggestion type ────────────────────────────────────────────────────────

export interface AISuggestion {
  type: 'standardize_values' | 'rename_column' | 'fix_dates' | 'merge_multichoice'
  column: string
  newName?: string
  description: string
  detail: string
  payload: Record<string, unknown>
}

// ─── Optional cleaning context ──────────────────────────────────────────────

export interface CleaningContext {
  researchQuestion?: string
  sourceType?: DataSource
}

// ─── Value standardization helpers ────────────────────────────────────────────

const SEX_MALE = /^(m|male|lalaki|laki|1)$/i
const SEX_FEMALE = /^(f|female|babae|1|2)$/i

const OUTCOME_RECOVERED = /^(r|recovered|alive|discharged|nabuhay|gumaling|well|improved)$/i
const OUTCOME_DIED = /^(d|died|dead|death|namatay|expired|deceased|DOA)$/i
const OUTCOME_UNKNOWN = /^(u|unknown|hindi\s*alam|lost|losttofu|ltfu|pending)$/i

const CASE_CONFIRMED = /^(c|confirmed|kumpirmado|positive|pos)$/i
const CASE_PROBABLE = /^(p|probable|malamang)$/i
const CASE_SUSPECT = /^(s|suspect|suspected|pinaghihinalaang|hinala)$/i

function standardizeSex(val: string): string {
  if (SEX_MALE.test(val.trim())) return 'Male'
  if (SEX_FEMALE.test(val.trim())) return 'Female'
  return 'Unknown'
}

function standardizeOutcome(val: string): string {
  if (OUTCOME_RECOVERED.test(val.trim())) return 'Recovered'
  if (OUTCOME_DIED.test(val.trim())) return 'Died'
  if (OUTCOME_UNKNOWN.test(val.trim())) return 'Unknown'
  return val
}

function standardizeCaseClassification(val: string): string {
  if (CASE_CONFIRMED.test(val.trim())) return 'Confirmed'
  if (CASE_PROBABLE.test(val.trim())) return 'Probable'
  if (CASE_SUSPECT.test(val.trim())) return 'Suspect'
  return val
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  const str = String(val).trim()
  if (!str) return null

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)

  // MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`

  // DD/MM/YYYY (try to detect if day > 12)
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmy && parseInt(dmy[1]) > 12) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

  // Month name: "May 3 2026", "3 May 2026"
  const monthNames = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December'
  const monthRe = new RegExp(`(${monthNames})\\s+(\\d{1,2})[,\\s]+(\\d{4})`, 'i')
  const mNameMatch = str.match(monthRe)
  if (mNameMatch) {
    const d = new Date(`${mNameMatch[1]} ${mNameMatch[2]} ${mNameMatch[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }

  // Try native Date parse as last resort
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function computeAge(birthday: unknown): number | null {
  const parsed = parseDate(birthday)
  if (!parsed) return null
  const dob = new Date(parsed)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age >= 0 && age < 150 ? age : null
}

// ─── Date correction helpers ───────────────────────────────────────────────────

export function correctDateOutlier(date: string, targetYear: number): string {
  const d = parseDate(date)
  if (!d) return date
  const parsed = new Date(d)
  parsed.setFullYear(targetYear)
  return parsed.toISOString().slice(0, 10)
}

// ─── Deduplicate helpers ──────────────────────────────────────────────────────

export function deduplicateRows(rows: RawRow[], rowIndices: number[]): RawRow[] {
  const indicesToRemove = new Set(rowIndices)
  return rows.filter((_, idx) => !indicesToRemove.has(idx))
}

// ─── Step generation ───────────────────────────────────────────────────────────

export function generateCleaningSteps(
  rows: RawRow[],
  keepColumns: string[],
  removeColumns: string[],
  birthdayColumn: string | null,
  source: DataSource,
  aiSuggestions: AISuggestion[],
  context?: CleaningContext
): CleaningStep[] {
  const steps: CleaningStep[] = []

  // Step 1: Remove columns
  if (removeColumns.length > 0) {
    steps.push({
      id: 'remove_columns',
      type: 'remove_columns',
      title: `Remove ${removeColumns.length} column${removeColumns.length > 1 ? 's' : ''}`,
      description: 'Remove PHI and system metadata columns from the dataset',
      detail: removeColumns.slice(0, 5).join(', ') + (removeColumns.length > 5 ? ` +${removeColumns.length - 5} more` : ''),
      status: 'pending',
      payload: { columns: removeColumns },
    })
  }

  // Step 2: Convert birthday → age
  if (birthdayColumn) {
    steps.push({
      id: 'convert_age',
      type: 'convert_age',
      title: 'Convert birthday to age',
      description: `Compute age from "${birthdayColumn}", then remove the birthday column`,
      detail: `"${birthdayColumn}" → age column (years). Birthday removed.`,
      status: 'pending',
      payload: { birthdayColumn },
    })
  }

  // Step 3: AI-suggested value standardizations
  for (let i = 0; i < aiSuggestions.length; i++) {
    const suggestion = aiSuggestions[i]
    if (suggestion.type === 'standardize_values') {
      steps.push({
        id: `standardize_${suggestion.column}`,
        type: 'standardize_values',
        title: `Standardize values in "${suggestion.column}"`,
        description: suggestion.description,
        detail: suggestion.detail,
        status: 'pending',
        payload: suggestion.payload,
      })
    }
    if (suggestion.type === 'rename_column') {
      steps.push({
        id: `rename_${suggestion.column}`,
        type: 'rename_columns',
        title: `Rename "${suggestion.column}" → "${suggestion.newName}"`,
        description: 'Standardize column name to WHO line list format',
        detail: `"${suggestion.column}" → "${suggestion.newName}"`,
        status: 'pending',
        payload: { from: suggestion.column, to: suggestion.newName },
      })
    }
    if (suggestion.type === 'fix_dates') {
      steps.push({
        id: `dates_${suggestion.column}`,
        type: 'fix_dates',
        title: `Standardize dates in "${suggestion.column}"`,
        description: suggestion.description,
        detail: suggestion.detail,
        status: 'pending',
        payload: { column: suggestion.column },
      })
    }
    if (suggestion.type === 'merge_multichoice') {
      steps.push({
        id: `merge_${suggestion.column}`,
        type: 'merge_multichoice',
        title: `Merge multi-choice columns → "${suggestion.newName}"`,
        description: suggestion.description,
        detail: suggestion.detail,
        status: 'pending',
        payload: suggestion.payload,
      })
    }
  }

  // Step 4: Auto-detect sex column and propose standardization if not already suggested
  const sexCol = keepColumns.find(c => /\b(sex|gender)\b/i.test(c))
  if (sexCol && !aiSuggestions.find(s => s.column === sexCol)) {
    const uniqueVals: string[] = []
    const seen = new Set<string>()
    for (let i = 0; i < rows.length; i++) {
      const val = String(rows[i][sexCol] ?? '').trim()
      if (val && !seen.has(val)) {
        seen.add(val)
        uniqueVals.push(val)
      }
    }
    const nonStandard = uniqueVals.filter(v => v !== 'Male' && v !== 'Female' && v !== 'Unknown')
    if (nonStandard.length > 0) {
      steps.push({
        id: 'standardize_sex',
        type: 'standardize_values',
        title: `Standardize sex values → Male / Female / Unknown`,
        description: `Found non-standard values in "${sexCol}"`,
        detail: `Found: ${nonStandard.slice(0, 5).map(v => `"${v}"`).join(', ')}. Recode all → Male / Female / Unknown.`,
        status: 'pending',
        payload: { column: sexCol, type: 'sex' },
      })
    }
  }

  // Step 5: Auto-detect test/dummy rows
  const nameCol = keepColumns.find(c => /\bname\b/i.test(c))
  if (nameCol) {
    const testRows: { idx: number; val: string }[] = []
    for (let i = 0; i < rows.length; i++) {
      const val = String(rows[i][nameCol] ?? '')
      if (/test|dummy|sample|xxx|asdf|123|test\s*user/i.test(val)) {
        testRows.push({ idx: i, val })
      }
    }
    if (testRows.length > 0) {
      steps.push({
        id: 'remove_test_rows',
        type: 'remove_test_rows',
        title: `Remove ${testRows.length} suspected test submission${testRows.length > 1 ? 's' : ''}`,
        description: `Found rows where "${nameCol}" looks like a test entry`,
        detail: testRows.slice(0, 3).map(r => `Row ${r.idx + 2}: "${r.val}"`).join(', '),
        status: 'pending',
        payload: { column: nameCol, pattern: 'test|dummy|sample|xxx|asdf|123|test\\s*user' },
      })
    }
  }

  return steps
}

// ─── Step execution ────────────────────────────────────────────────────────────

export function applyCleaningSteps(
  rows: RawRow[],
  steps: CleaningStep[]
): RawRow[] {
  let result = [...rows]
  const columnsToRemove = new Set<string>()

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (step.status !== 'accepted') continue

    if (step.type === 'remove_columns') {
      const cols = step.payload.columns as string[]
      for (let j = 0; j < cols.length; j++) {
        columnsToRemove.add(cols[j])
      }
    }

    if (step.type === 'remove_rows') {
      const rowIndices = step.payload.rowIndices as number[]
      const indicesToRemove = new Set(rowIndices)
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        if (!indicesToRemove.has(j)) {
          newResult.push(result[j])
        }
      }
      result = newResult
    }

    if (step.type === 'convert_age') {
      const bday = step.payload.birthdayColumn as string
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        const age = computeAge(row[bday])
        const newRow: RawRow = {}
        for (const key of Object.keys(row)) {
          if (key !== bday) {
            newRow[key] = row[key]
          }
        }
        if (age !== null) newRow['age'] = age
        newResult.push(newRow)
      }
      result = newResult
    }

    if (step.type === 'standardize_values') {
      const col = step.payload.column as string
      const type = step.payload.type as string
      const recode = step.payload.recode as Record<string, string> | undefined
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        const val = String(row[col] ?? '')
        let newVal = val
        if (type === 'sex') newVal = standardizeSex(val)
        else if (type === 'outcome') newVal = standardizeOutcome(val)
        else if (type === 'case_classification') newVal = standardizeCaseClassification(val)
        else if (recode && recode[val] !== undefined) newVal = recode[val]
        const newRow = { ...row, [col]: newVal }
        newResult.push(newRow)
      }
      result = newResult
    }

    if (step.type === 'fix_dates') {
      const col = step.payload.column as string
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        const parsed = parseDate(row[col])
        const newRow = { ...row, [col]: parsed ?? row[col] }
        newResult.push(newRow)
      }
      result = newResult
    }

    if (step.type === 'correct_date') {
      const col = step.payload.column as string
      const targetYear = step.payload.targetYear as number
      const rowIndices = step.payload.rowIndices as number[]
      const indices = new Set(rowIndices)
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        if (indices.has(j) && row[col]) {
          const corrected = correctDateOutlier(String(row[col]), targetYear)
          const newRow = { ...row, [col]: corrected }
          newResult.push(newRow)
        } else {
          newResult.push(row)
        }
      }
      result = newResult
    }

    // FIXED: Handle rename_columns properly - apply immediately
    if (step.type === 'rename_columns') {
      const from = step.payload.from as string
      const to = step.payload.to as string
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        const newRow: RawRow = {}
        for (const key of Object.keys(row)) {
          if (key === from) {
            newRow[to] = row[key]
          } else {
            newRow[key] = row[key]
          }
        }
        newResult.push(newRow)
      }
      result = newResult
      // Remove the old column from the removal set if it was there
      columnsToRemove.delete(from)
    }

    if (step.type === 'merge_multichoice') {
      const sourceCols = step.payload.columns as string[]
      const targetCol = step.payload.targetColumn as string
      const labels = step.payload.labels as Record<string, string>
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        const selected: string[] = []
        for (let k = 0; k < sourceCols.length; k++) {
          const c = sourceCols[k]
          const val = row[c]
          if (val === 1 || val === '1' || val === true || val === 'True' || val === 'TRUE') {
            selected.push(labels[c] || c)
          }
        }
        const newRow: RawRow = {}
        for (const key of Object.keys(row)) {
          if (!sourceCols.includes(key)) {
            newRow[key] = row[key]
          }
        }
        newRow[targetCol] = selected.join(', ') || 'None'
        newResult.push(newRow)
      }
      result = newResult
      for (let k = 0; k < sourceCols.length; k++) {
        columnsToRemove.add(sourceCols[k])
      }
    }

    if (step.type === 'remove_test_rows') {
      const col = step.payload.column as string
      const pattern = new RegExp(step.payload.pattern as string, 'i')
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        if (!pattern.test(String(row[col] ?? ''))) {
          newResult.push(row)
        }
      }
      result = newResult
    }

    if (step.type === 'deduplicate') {
      const rowIndices = step.payload.rowIndices as number[]
      const indicesToRemove = new Set(rowIndices)
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        if (!indicesToRemove.has(j)) {
          newResult.push(result[j])
        }
      }
      result = newResult
    }

    if (step.type === 'convert_type') {
      const col = step.payload.column as string
      const targetType = step.payload.targetType as string
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        const newRow = { ...row }
        if (targetType === 'number') {
          newRow[col] = Number(row[col])
        } else if (targetType === 'string') {
          newRow[col] = String(row[col] ?? '')
        }
        newResult.push(newRow)
      }
      result = newResult
    }

    if (step.type === 'fill_missing') {
      const col = step.payload.column as string
      const fillValue = step.payload.fillValue
      const rowIndices = step.payload.rowIndices as number[]
      const indices = new Set(rowIndices)
      const newResult: RawRow[] = []
      for (let j = 0; j < result.length; j++) {
        const row = result[j]
        if (indices.has(j) && (row[col] === null || row[col] === undefined || row[col] === '')) {
          const newRow = { ...row, [col]: fillValue }
          newResult.push(newRow)
        } else {
          newResult.push(row)
        }
      }
      result = newResult
    }
  }

  // Apply column removals
  if (columnsToRemove.size > 0) {
    const newResult: RawRow[] = []
    for (let j = 0; j < result.length; j++) {
      const row = result[j]
      const newRow: RawRow = {}
      for (const key of Object.keys(row)) {
        if (!columnsToRemove.has(key)) {
          newRow[key] = row[key]
        }
      }
      newResult.push(newRow)
    }
    result = newResult
  }

  return result
}
