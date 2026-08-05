// Core data quality detection engine
// Runs entirely in the browser on the raw data

import type { RawRow } from './lineListCleaner'

export interface QualityIssue {
  id: string
  type: QualityIssueType
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  whyItMatters: string
  suggestedFix: string
  fixAction: QualityFixAction
  affectedRows?: number[]
  affectedColumns?: string[]
  affectedValues?: string[]
  autoFixable: boolean
}

export type QualityIssueType =
  | 'date_outlier'
  | 'missing_essential'
  | 'inconsistent_values'
  | 'unlikely_value'
  | 'duplicate_record'
  | 'wrong_data_type'
  | 'out_of_range'
  | 'column_not_relevant'
  | 'suspected_test_data'
  | 'phi_detected'

export interface QualityFixAction {
  type: 'correct_date' | 'remove_rows' | 'standardize' | 'remove_columns' | 'convert_type' | 'deduplicate' | 'fill_missing'
  payload: Record<string, unknown>
}

export interface QualityReport {
  issues: QualityIssue[]
  summary: {
    totalIssues: number
    critical: number
    warning: number
    info: number
    autoFixable: number
    rowsAffected: number
    columnsAffected: number
  }
  dataStats: {
    rowCount: number
    columnCount: number
    missingValues: number
    uniqueDates: number
    dateRange: { min: string; max: string } | null
  }
}

export function generateQualityReport(
  rows: RawRow[],
  columns: string[],
  researchQuestion: string,
  detectedSource: string
): QualityReport {
  const issues: QualityIssue[] = []
  let issueId = 0

  // 1. Check for date outliers - FIXED
  const dateColumn = findDateColumn(columns)
  if (dateColumn) {
    const dateOutliers = detectDateOutliers(rows, dateColumn)
    if (dateOutliers.length > 0) {
      const mostCommonYear = getMostCommonYear(rows, dateColumn)
      const affectedValues: string[] = []
      for (let i = 0; i < dateOutliers.length; i++) {
        const idx = dateOutliers[i]
        const val = rows[idx][dateColumn]
        if (val) affectedValues.push(String(val))
      }

      issues.push({
        id: `issue_${issueId++}`,
        type: 'date_outlier',
        severity: 'warning',
        title: `${dateOutliers.length} date outlier${dateOutliers.length > 1 ? 's' : ''} found in "${dateColumn}"`,
        description: `${dateOutliers.length} date${dateOutliers.length > 1 ? 's' : ''} (${affectedValues.slice(0, 3).join(', ')}${affectedValues.length > 3 ? ` +${affectedValues.length - 3} more` : ''}) are in a different year than the majority of dates.`,
        whyItMatters: 'Outlier dates can distort epidemic curves and time-series analysis. A single date from a different year will appear as a separate bar, making the outbreak pattern harder to interpret.',
        suggestedFix: `Correct these dates to ${mostCommonYear}`,
        fixAction: {
          type: 'correct_date',
          payload: {
            column: dateColumn,
            targetYear: mostCommonYear,
            rowIndices: dateOutliers,
          },
        },
        affectedRows: dateOutliers,
        affectedColumns: [dateColumn],
        affectedValues: affectedValues,
        autoFixable: true,
      })
    }
  }

  // 2. Check for missing essential data
  const essentialColumns = detectEssentialColumns(columns, researchQuestion)
  for (let i = 0; i < essentialColumns.length; i++) {
    const col = essentialColumns[i]
    const missingRows: number[] = []
    for (let j = 0; j < rows.length; j++) {
      const val = rows[j][col]
      if (val === null || val === undefined || val === '') {
        missingRows.push(j)
      }
    }
    if (missingRows.length > 0) {
      issues.push({
        id: `issue_${issueId++}`,
        type: 'missing_essential',
        severity: missingRows.length > rows.length * 0.3 ? 'critical' : 'warning',
        title: `Missing data in essential column "${col}"`,
        description: `${missingRows.length} row${missingRows.length > 1 ? 's' : ''} (${Math.round(missingRows.length / rows.length * 100)}%) are missing values for "${col}".`,
        whyItMatters: `"${col}" appears to be essential for your analysis based on your research question. Missing values in this column can break statistical tests or reduce your sample size.`,
        suggestedFix: missingRows.length > rows.length * 0.3
          ? 'Consider removing the column or imputing missing values'
          : `Remove ${missingRows.length} row${missingRows.length > 1 ? 's' : ''} with missing values`,
        fixAction: {
          type: missingRows.length > rows.length * 0.3 ? 'remove_columns' : 'remove_rows',
          payload: {
            columns: [col],
            rowIndices: missingRows,
          },
        },
        affectedRows: missingRows,
        affectedColumns: [col],
        autoFixable: missingRows.length <= rows.length * 0.3,
      })
    }
  }

  // 3. Check for inconsistent values (categorical columns)
  const categoricalColumns = detectCategoricalColumns(rows, columns)
  for (let i = 0; i < categoricalColumns.length; i++) {
    const col = categoricalColumns[i]
    const valueMap = new Map<string, number>()
    const uniqueValues: string[] = []
    for (let j = 0; j < rows.length; j++) {
      const val = String(rows[j][col] ?? '').trim()
      if (val) {
        if (!valueMap.has(val)) uniqueValues.push(val)
        valueMap.set(val, (valueMap.get(val) || 0) + 1)
      }
    }
    const variations = detectValueVariations(uniqueValues, col)
    if (variations.length > 0) {
      const standardMap = createStandardizationMap(variations, col)
      issues.push({
        id: `issue_${issueId++}`,
        type: 'inconsistent_values',
        severity: 'warning',
        title: `Inconsistent values in "${col}"`,
        description: `Found ${variations.length} variation${variations.length > 1 ? 's' : ''} of the same category: ${variations.map(v => `"${v}"`).join(', ')}`,
        whyItMatters: 'Inconsistent categorical values will be treated as separate categories in analysis, splitting your data incorrectly.',
        suggestedFix: `Standardize to: ${Object.values(standardMap)[0] || 'standardized value'}`,
        fixAction: {
          type: 'standardize',
          payload: {
            column: col,
            mappings: standardMap,
          },
        },
        affectedColumns: [col],
        affectedValues: variations,
        autoFixable: true,
      })
    }
  }

  // 4. Check for unlikely values (numeric columns)
  const numericColumns = detectNumericColumns(rows, columns)
  for (let i = 0; i < numericColumns.length; i++) {
    const col = numericColumns[i]
    const values: number[] = []
    for (let j = 0; j < rows.length; j++) {
      const num = Number(rows[j][col])
      if (!isNaN(num)) values.push(num)
    }
    if (values.length === 0) continue
    let sum = 0
    for (let j = 0; j < values.length; j++) {
      sum += values[j]
    }
    const mean = sum / values.length
    let squaredDiffSum = 0
    for (let j = 0; j < values.length; j++) {
      squaredDiffSum += (values[j] - mean) ** 2
    }
    const std = Math.sqrt(squaredDiffSum / values.length)
    const outlierRows: number[] = []
    const outlierValues: string[] = []
    for (let j = 0; j < values.length; j++) {
      if (Math.abs(values[j] - mean) > 3 * std && values[j] > 0) {
        outlierRows.push(j)
        outlierValues.push(String(values[j]))
      }
    }
    if (outlierRows.length > 0) {
      issues.push({
        id: `issue_${issueId++}`,
        type: 'unlikely_value',
        severity: 'warning',
        title: `Unlikely values in "${col}"`,
        description: `${outlierRows.length} value${outlierRows.length > 1 ? 's' : ''} in "${col}" are statistical outliers (more than 3 standard deviations from the mean).`,
        whyItMatters: 'Extreme outliers can skew statistical results and may indicate data entry errors.',
        suggestedFix: `Review and correct these ${outlierRows.length} value${outlierRows.length > 1 ? 's' : ''}`,
        fixAction: {
          type: 'remove_rows',
          payload: {
            rowIndices: outlierRows,
          },
        },
        affectedRows: outlierRows,
        affectedColumns: [col],
        affectedValues: outlierValues,
        autoFixable: false,
      })
    }
  }

  // 5. Check for duplicate records
  const duplicateGroups = findDuplicateRecords(rows, columns)
  if (duplicateGroups.length > 0) {
    const duplicateRows: number[] = []
    for (let i = 0; i < duplicateGroups.length; i++) {
      for (let j = 0; j < duplicateGroups[i].length; j++) {
        duplicateRows.push(duplicateGroups[i][j])
      }
    }
    issues.push({
      id: `issue_${issueId++}`,
      type: 'duplicate_record',
      severity: 'warning',
      title: `Duplicate records detected`,
      description: `Found ${duplicateGroups.length} group${duplicateGroups.length > 1 ? 's' : ''} of duplicate records (${duplicateRows.length} total row${duplicateRows.length > 1 ? 's' : ''})`,
      whyItMatters: 'Duplicate records will be double-counted in your analysis, inflating case counts and distorting results.',
      suggestedFix: `Remove ${duplicateRows.length} duplicate row${duplicateRows.length > 1 ? 's' : ''}`,
      fixAction: {
        type: 'deduplicate',
        payload: {
          rowIndices: duplicateRows,
        },
      },
      affectedRows: duplicateRows,
      autoFixable: true,
    })
  }

  // 6. Check for columns not relevant to research question
  const irrelevantColumns = findIrrelevantColumns(columns, researchQuestion)
  if (irrelevantColumns.length > 0) {
    issues.push({
      id: `issue_${issueId++}`,
      type: 'column_not_relevant',
      severity: 'info',
      title: `${irrelevantColumns.length} column${irrelevantColumns.length > 1 ? 's' : ''} may not be needed`,
      description: `These columns don't appear to be relevant to your research question: ${irrelevantColumns.slice(0, 5).join(', ')}${irrelevantColumns.length > 5 ? ` +${irrelevantColumns.length - 5} more` : ''}`,
      whyItMatters: 'Removing irrelevant columns makes your data cleaner and easier to work with. It also reduces file size and speeds up processing.',
      suggestedFix: `Remove ${irrelevantColumns.length} column${irrelevantColumns.length > 1 ? 's' : ''}`,
      fixAction: {
        type: 'remove_columns',
        payload: {
          columns: irrelevantColumns,
        },
      },
      affectedColumns: irrelevantColumns,
      autoFixable: true,
    })
  }

  // 7. Check for suspected test data
  const testRows = findTestRows(rows, columns)
  if (testRows.length > 0) {
    issues.push({
      id: `issue_${issueId++}`,
      type: 'suspected_test_data',
      severity: 'critical',
      title: `Suspected test data detected`,
      description: `${testRows.length} row${testRows.length > 1 ? 's' : ''} appear to be test or sample data (e.g., "test", "dummy", "xxx", "sample")`,
      whyItMatters: 'Test data can contaminate your analysis and produce false results.',
      suggestedFix: `Remove ${testRows.length} test row${testRows.length > 1 ? 's' : ''}`,
      fixAction: {
        type: 'remove_rows',
        payload: {
          rowIndices: testRows,
        },
      },
      affectedRows: testRows,
      autoFixable: true,
    })
  }

  // Build summary
  let critical = 0
  let warning = 0
  let info = 0
  let autoFixable = 0
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i]
    if (issue.severity === 'critical') critical++
    else if (issue.severity === 'warning') warning++
    else if (issue.severity === 'info') info++
    if (issue.autoFixable) autoFixable++
  }

  const affectedRows = new Set<number>()
  const affectedColumns = new Set<string>()
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i]
    if (issue.affectedRows) {
      for (let j = 0; j < issue.affectedRows.length; j++) {
        affectedRows.add(issue.affectedRows[j])
      }
    }
    if (issue.affectedColumns) {
      for (let j = 0; j < issue.affectedColumns.length; j++) {
        affectedColumns.add(issue.affectedColumns[j])
      }
    }
  }

  // Date range stats
  let dateRange: { min: string; max: string } | null = null
  if (dateColumn) {
    const dates: Date[] = []
    for (let i = 0; i < rows.length; i++) {
      const val = rows[i][dateColumn]
      if (val) {
        const d = new Date(val as string)
        if (!isNaN(d.getTime())) dates.push(d)
      }
    }
    if (dates.length > 0) {
      let minTime = dates[0].getTime()
      let maxTime = dates[0].getTime()
      for (let i = 1; i < dates.length; i++) {
        const time = dates[i].getTime()
        if (time < minTime) minTime = time
        if (time > maxTime) maxTime = time
      }
      dateRange = {
        min: new Date(minTime).toISOString().slice(0, 10),
        max: new Date(maxTime).toISOString().slice(0, 10),
      }
    }
  }

  // Missing values count
  let missingValues = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j]
      if (row[col] === null || row[col] === undefined || row[col] === '') missingValues++
    }
  }

  return {
    issues,
    summary: {
      totalIssues: issues.length,
      critical,
      warning,
      info,
      autoFixable,
      rowsAffected: affectedRows.size,
      columnsAffected: affectedColumns.size,
    },
    dataStats: {
      rowCount: rows.length,
      columnCount: columns.length,
      missingValues,
      uniqueDates: dateRange && dateColumn ? datesCount(rows, dateColumn) : 0,
      dateRange,
    },
  }
}

// ─── Helper functions ──────────────────────────────────────────────────────────

function findDateColumn(columns: string[]): string | null {
  const datePatterns = [
    /date/i, /onset/i, /admit/i, /discharge/i, /report/i, /consult/i,
    /collected/i, /result/i, /birth/i, /dob/i, /died/i, /expired/i
  ]
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]
    for (let j = 0; j < datePatterns.length; j++) {
      if (datePatterns[j].test(col)) return col
    }
  }
  return null
}

// FIXED: Now detects ANY date that is not in the most common year
function detectDateOutliers(rows: RawRow[], dateColumn: string): number[] {
  const parsedDates: { idx: number; date: Date }[] = []
  for (let i = 0; i < rows.length; i++) {
    const val = rows[i][dateColumn]
    if (val) {
      const d = new Date(val as string)
      if (!isNaN(d.getTime())) {
        parsedDates.push({ idx: i, date: d })
      }
    }
  }

  if (parsedDates.length < 2) return []

  // Find the most common year
  const yearCounts = new Map<number, number>()
  for (let i = 0; i < parsedDates.length; i++) {
    const year = parsedDates[i].date.getFullYear()
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
  }

  let mostCommonYear = 0
  let maxCount = 0
  const entries = Array.from(yearCounts.entries())
  for (let i = 0; i < entries.length; i++) {
    const [year, count] = entries[i]
    if (count > maxCount) {
      maxCount = count
      mostCommonYear = year
    }
  }

  // Return indices of rows with dates NOT in the most common year
  const outliers: number[] = []
  for (let i = 0; i < parsedDates.length; i++) {
    const year = parsedDates[i].date.getFullYear()
    if (year !== mostCommonYear) {
      outliers.push(parsedDates[i].idx)
    }
  }

  return outliers
}

function getMostCommonYear(rows: RawRow[], dateColumn: string): number {
  const years: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const val = rows[i][dateColumn]
    if (val) {
      const d = new Date(val as string)
      if (!isNaN(d.getTime())) years.push(d.getFullYear())
    }
  }
  if (years.length === 0) return new Date().getFullYear()

  const yearCounts = new Map<number, number>()
  for (let i = 0; i < years.length; i++) {
    const year = years[i]
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
  }

  let mostCommonYear = 0
  let maxCount = 0
  const entries = Array.from(yearCounts.entries())
  for (let i = 0; i < entries.length; i++) {
    const [year, count] = entries[i]
    if (count > maxCount) {
      maxCount = count
      mostCommonYear = year
    }
  }
  return mostCommonYear
}

function datesCount(rows: RawRow[], dateColumn: string): number {
  const dates = new Set<string>()
  for (let i = 0; i < rows.length; i++) {
    const val = rows[i][dateColumn]
    if (val) {
      const d = new Date(val as string)
      if (!isNaN(d.getTime())) dates.add(d.toISOString().slice(0, 10))
    }
  }
  return dates.size
}

function detectEssentialColumns(columns: string[], researchQuestion: string): string[] {
  const essential: string[] = []
  const rq = researchQuestion.toLowerCase()

  const essentialMappings: Record<string, string[]> = {
    'risk factor': ['age', 'sex', 'gender', 'outcome', 'exposure'],
    'severity': ['age', 'sex', 'outcome', 'symptom', 'lab_result', 'comorbidity'],
    'outbreak': ['date', 'onset', 'age', 'sex', 'address', 'barangay', 'outcome'],
    'demographic': ['age', 'sex', 'gender', 'barangay', 'address', 'municipality'],
    'surveillance': ['date', 'report', 'case_classification', 'outcome'],
    'vaccine': ['vaccination', 'age', 'sex', 'outcome'],
    'response': ['date', 'admit', 'discharge', 'management', 'outcome'],
  }

  const keys = Object.keys(essentialMappings)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const cols = essentialMappings[key]
    if (rq.includes(key)) {
      for (let j = 0; j < cols.length; j++) {
        const col = cols[j]
        let matched = ''
        for (let k = 0; k < columns.length; k++) {
          if (columns[k].toLowerCase().includes(col)) {
            matched = columns[k]
            break
          }
        }
        if (matched && !essential.includes(matched)) essential.push(matched)
      }
    }
  }

  const dateCol = findDateColumn(columns)
  if (dateCol && !essential.includes(dateCol)) essential.push(dateCol)

  if (essential.length === 0) return columns
  return essential
}

function detectCategoricalColumns(rows: RawRow[], columns: string[]): string[] {
  const categorical: string[] = []
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]
    const values: string[] = []
    for (let j = 0; j < rows.length; j++) {
      const val = String(rows[j][col] ?? '').trim()
      if (val) values.push(val)
    }
    if (values.length === 0) continue
    const unique = new Set(values)
    if (unique.size / values.length < 0.2) {
      categorical.push(col)
    }
  }
  return categorical
}

function detectValueVariations(uniqueValues: string[], column: string): string[] {
  const variations: string[] = []
  const commonMappings: Record<string, string[]> = {
    'sex': ['male', 'm', 'man', 'lalaki', 'laki', '1'],
    'female': ['female', 'f', 'woman', 'babae', '2'],
    'died': ['died', 'dead', 'death', 'expired', 'deceased', 'namatay', 'd'],
    'recovered': ['recovered', 'alive', 'discharged', 'gumaling', 'nabuhay', 'r'],
    'confirmed': ['confirmed', 'positive', 'kumpirmado', 'pos', 'c'],
    'probable': ['probable', 'malamang', 'p'],
    'suspect': ['suspect', 'suspected', 'pinaghihinalaang', 's'],
  }

  const keys = Object.keys(commonMappings)
  for (let i = 0; i < keys.length; i++) {
    const standard = keys[i]
    const variants = commonMappings[standard]
    const found: string[] = []
    for (let j = 0; j < uniqueValues.length; j++) {
      const v = uniqueValues[j]
      for (let k = 0; k < variants.length; k++) {
        if (variants[k].toLowerCase() === v.toLowerCase()) {
          found.push(v)
          break
        }
      }
    }
    if (found.length > 1) {
      for (let j = 0; j < found.length; j++) {
        variations.push(found[j])
      }
    }
  }

  return variations
}

function createStandardizationMap(variations: string[], column: string): Record<string, string> {
  const map: Record<string, string> = {}
  const columnLower = column.toLowerCase()

  if (columnLower.includes('sex') || columnLower.includes('gender')) {
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i]
      const lower = v.toLowerCase()
      if (['male', 'm', 'man', 'lalaki', 'laki', '1'].includes(lower)) {
        map[v] = 'Male'
      } else if (['female', 'f', 'woman', 'babae', '2'].includes(lower)) {
        map[v] = 'Female'
      } else {
        map[v] = 'Unknown'
      }
    }
  } else if (columnLower.includes('outcome') || columnLower.includes('status')) {
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i]
      const lower = v.toLowerCase()
      if (['died', 'dead', 'death', 'expired', 'deceased', 'namatay', 'd'].includes(lower)) {
        map[v] = 'Died'
      } else if (['recovered', 'alive', 'discharged', 'gumaling', 'nabuhay', 'r'].includes(lower)) {
        map[v] = 'Recovered'
      } else {
        map[v] = 'Unknown'
      }
    }
  }

  return map
}

function detectNumericColumns(rows: RawRow[], columns: string[]): string[] {
  const numeric: string[] = []
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]
    let count = 0
    for (let j = 0; j < rows.length; j++) {
      const num = Number(rows[j][col])
      if (!isNaN(num)) count++
    }
    if (count > 0 && count / rows.length > 0.3) {
      numeric.push(col)
    }
  }
  return numeric
}

function findDuplicateRecords(rows: RawRow[], columns: string[]): number[][] {
  const groups: number[][] = []
  const seen = new Map<string, number>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const fingerprintParts: string[] = []
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j]
      if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
        fingerprintParts.push(String(row[col]).trim())
      }
    }
    const fingerprint = fingerprintParts.join('|')
    if (!fingerprint) continue

    if (seen.has(fingerprint)) {
      const groupIndex = seen.get(fingerprint)!
      if (!groups[groupIndex]) groups[groupIndex] = [seen.get(fingerprint)!]
      groups[groupIndex].push(i)
    } else {
      seen.set(fingerprint, groups.length)
      groups.push([i])
    }
  }

  const result: number[][] = []
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length > 1) {
      result.push(groups[i])
    }
  }
  return result
}

function findIrrelevantColumns(columns: string[], researchQuestion: string): string[] {
  if (!researchQuestion || researchQuestion.trim() === '') return []

  const rq = researchQuestion.toLowerCase()
  const relevantTerms = new Set<string>()

  const words = rq.split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    if (words[i].length > 3) relevantTerms.add(words[i])
  }

  const epiTerms = ['age', 'sex', 'gender', 'date', 'onset', 'outcome', 'case', 'exposure', 'risk', 'factor', 'symptom', 'lab', 'result', 'vaccine', 'treatment', 'management', 'address', 'barangay', 'municipality', 'province', 'region', 'outbreak', 'cluster', 'surveillance', 'report', 'admit', 'discharge']
  for (let i = 0; i < epiTerms.length; i++) {
    relevantTerms.add(epiTerms[i])
  }

  const irrelevant: string[] = []
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]
    const colLower = col.toLowerCase()
    let isRelevant = false

    const termArray = Array.from(relevantTerms)
    for (let j = 0; j < termArray.length; j++) {
      if (colLower.includes(termArray[j])) {
        isRelevant = true
        break
      }
    }

    if (!isRelevant) {
      for (let j = 0; j < words.length; j++) {
        if (words[j].length > 3 && colLower.includes(words[j])) {
          isRelevant = true
          break
        }
      }
    }

    if (!isRelevant) {
      irrelevant.push(col)
    }
  }

  return irrelevant
}

function findTestRows(rows: RawRow[], columns: string[]): number[] {
  const testPatterns = /test|dummy|sample|xxx|asdf|123|test\s*user|demo|trial|example|testing|placeholder/i
  const testRows: number[] = []

  const checkColumns = columns.slice(0, Math.min(5, columns.length))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    let isTest = false
    for (let j = 0; j < checkColumns.length; j++) {
      const col = checkColumns[j]
      const val = String(row[col] ?? '').trim()
      if (testPatterns.test(val)) {
        isTest = true
        break
      }
    }
    if (isTest) {
      testRows.push(i)
    }
  }

  return testRows
}
