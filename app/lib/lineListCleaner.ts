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

export interface CleaningStep {
  id: string
  type: CleaningStepType
  title: string
  description: string
  detail: string           // shown in the UI — specific values affected
  status: 'pending' | 'accepted' | 'skipped' | 'applied'
  payload: Record<string, unknown>
}

export type RawRow = Record<string, unknown>

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

// ─── Step generation ───────────────────────────────────────────────────────────

export function generateCleaningSteps(
  rows: RawRow[],
  keepColumns: string[],
  removeColumns: string[],
  birthdayColumn: string | null,
  source: DataSource,
  aiSuggestions: AISuggestion[]
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
  for (const suggestion of aiSuggestions) {
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
    const uniqueVals = [...new Set(rows.map(r => String(r[sexCol] ?? '')).filter(Boolean))]
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
    const testRows = rows
      .map((r, i) => ({ idx: i, val: String(r[nameCol] ?? '') }))
      .filter(r => /test|dummy|sample|xxx|asdf|123|test\s*user/i.test(r.val))
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
  let columnRenames: Record<string, string> = {}
  const columnsToRemove = new Set<string>()

  for (const step of steps) {
    if (step.status !== 'accepted') continue

    if (step.type === 'remove_columns') {
      const cols = step.payload.columns as string[]
      cols.forEach(c => columnsToRemove.add(c))
    }

    if (step.type === 'convert_age') {
      const bday = step.payload.birthdayColumn as string
      result = result.map(row => {
        const age = computeAge(row[bday])
        const newRow = { ...row }
        if (age !== null) newRow['age'] = age
        delete newRow[bday]
        return newRow
      })
    }

    if (step.type === 'standardize_values') {
      const col = step.payload.column as string
      const type = step.payload.type as string
      const recode = step.payload.recode as Record<string, string> | undefined
      result = result.map(row => {
        const val = String(row[col] ?? '')
        let newVal = val
        if (type === 'sex') newVal = standardizeSex(val)
        else if (type === 'outcome') newVal = standardizeOutcome(val)
        else if (type === 'case_classification') newVal = standardizeCaseClassification(val)
        else if (recode && recode[val] !== undefined) newVal = recode[val]
        return { ...row, [col]: newVal }
      })
    }

    if (step.type === 'fix_dates') {
      const col = step.payload.column as string
      result = result.map(row => {
        const parsed = parseDate(row[col])
        return { ...row, [col]: parsed ?? row[col] }
      })
    }

    if (step.type === 'rename_columns') {
      const from = step.payload.from as string
      const to = step.payload.to as string
      columnRenames[from] = to
    }

    if (step.type === 'merge_multichoice') {
      const sourceCols = step.payload.columns as string[]
      const targetCol = step.payload.targetColumn as string
      const labels = step.payload.labels as Record<string, string>
      result = result.map(row => {
        const selected = sourceCols
          .filter(c => row[c] === 1 || row[c] === '1' || row[c] === true || row[c] === 'True' || row[c] === 'TRUE')
          .map(c => labels[c] || c)
        const newRow = { ...row, [targetCol]: selected.join(', ') || 'None' }
        sourceCols.forEach(c => delete newRow[c])
        return newRow
      })
      sourceCols.forEach(c => columnsToRemove.add(c))
    }

    if (step.type === 'remove_test_rows') {
      const col = step.payload.column as string
      const pattern = new RegExp(step.payload.pattern as string, 'i')
      result = result.filter(row => !pattern.test(String(row[col] ?? '')))
    }
  }

  // Apply column removals
  if (columnsToRemove.size > 0) {
    result = result.map(row => {
      const newRow = { ...row }
      columnsToRemove.forEach(c => delete newRow[c])
      return newRow
    })
  }

  // Apply column renames
  if (Object.keys(columnRenames).length > 0) {
    result = result.map(row => {
      const newRow: RawRow = {}
      for (const [key, val] of Object.entries(row)) {
        newRow[columnRenames[key] || key] = val
      }
      return newRow
    })
  }

  return result
}

// ─── AI suggestion type ────────────────────────────────────────────────────────

export interface AISuggestion {
  type: 'standardize_values' | 'rename_column' | 'fix_dates' | 'merge_multichoice'
  column: string
  newName?: string
  description: string
  detail: string
  payload: Record<string, unknown>
}
