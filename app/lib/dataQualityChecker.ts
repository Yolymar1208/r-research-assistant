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

  // 1. Check for date outliers
  const dateColumn = findDateColumn(columns)
  if (dateColumn) {
    const dateOutliers = detectDateOutliers(rows, dateColumn)
    if (dateOutliers.length > 0) {
      issues.push({
        id: `issue_${issueId++}`,
        type: 'date_outlier',
        severity: 'warning',
        title: `Date outlier found in "${dateColumn}"`,
        description: `${dateOutliers.length} date${dateOutliers.length > 1 ? 's' : ''} fall outside the expected range for this dataset.`,
        whyItMatters: 'Outlier dates can distort epidemic curves and time-series analysis. A single date from a different year will appear as a separate bar, making the outbreak pattern harder to interpret.',
        suggestedFix: `Correct these dates to the most common year (${getMostCommonYear(rows, dateColumn)})`,
        fixAction: {
          type: 'correct_date',
          payload: {
            column: dateColumn,
            targetYear: getMostCommonYear(rows, dateColumn),
            rowIndices: dateOutliers,
          },
        },
        affectedRows: dateOutliers,
        affectedColumns: [dateColumn],
        autoFixable: true,
      })
    }
  }

  // 2. Check for missing essential data
  const essentialColumns = detectEssentialColumns(columns, researchQuestion)
  for (const col of essentialColumns) {
    const missingRows = rows
      .map((row, idx) => ({ idx, val: row[col] }))
      .filter(r => r.val === null || r.val === undefined || r.val === '')
      .map(r => r.idx)
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
  for (const col of categoricalColumns) {
    const valueMap = new Map<string, number>()
    const uniqueValues: string[] = []
    for (const row of rows) {
      const val = String(row[col] ?? '').trim()
      if (val) {
        if (!valueMap.has(val)) uniqueValues.push(val)
        valueMap.set(val, (valueMap.get(val) || 0) + 1)
      }
    }
    // If there are multiple variations of the same category
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
  for (const col of numericColumns) {
    const values = rows.map(r => Number(r[col])).filter(v => !isNaN(v))
    if (values.length === 0) continue
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
    const outliers = values
      .map((v, idx) => ({ idx, val: v }))
      .filter(({ val }) => Math.abs(val - mean) > 3 * std)
      .filter(({ val }) => val > 0) // Only positive outliers
    if (outliers.length > 0) {
      const outlierRows = outliers.map(o => o.idx)
      issues.push({
        id: `issue_${issueId++}`,
        type: 'unlikely_value',
        severity: 'warning',
        title: `Unlikely values in "${col}"`,
        description: `${outliers.length} value${outliers.length > 1 ? 's' : ''} in "${col}" are statistical outliers (more than 3 standard deviations from the mean).`,
        whyItMatters: 'Extreme outliers can skew statistical results and may indicate data entry errors.',
        suggestedFix: `Review and correct these ${outliers.length} value${outliers.length > 1 ? 's' : ''}`,
        fixAction: {
          type: 'remove_rows',
          payload: {
            rowIndices: outlierRows,
          },
        },
        affectedRows: outlierRows,
        affectedColumns: [col],
        affectedValues: outliers.map(o => String(o.val)),
        autoFixable: false, // User should review manually
      })
    }
  }

  // 5. Check for duplicate records
  const duplicateGroups = findDuplicateRecords(rows, columns)
  if (duplicateGroups.length > 0) {
    const duplicateRows = duplicateGroups.flat()
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

  // 8. PHI detection (already handled by phiDetector.ts)
  // We'll let the existing phiDetector handle this in the UI

  // Build summary
  const critical = issues.filter(i => i.severity === 'critical').length
  const warning = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length
  const autoFixable = issues.filter(i => i.autoFixable).length

  const affectedRows = new Set<number>()
  const affectedColumns = new Set<string>()
  for (const issue of issues) {
    if (issue.affectedRows) issue.affectedRows.forEach(r => affectedRows.add(r))
    if (issue.affectedColumns) issue.affectedColumns.forEach(c => affectedColumns.add(c))
  }

  // Date range stats
  let dateRange: { min: string; max: string } | null = null
  if (dateColumn) {
    const dates = rows
      .map(r => r[dateColumn])
      .filter(d => d)
      .map(d => new Date(d as string))
      .filter(d => !isNaN(d.getTime()))
    if (dates.length > 0) {
      dateRange = {
        min: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().slice(0, 10),
        max: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().slice(0, 10),
      }
    }
  }

  // Missing values count
  let missingValues = 0
  for (const row of rows) {
    for (const col of columns) {
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
      // FIXED: Check that dateColumn is not null before passing to datesCount
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
  for (const col of columns) {
    for (const pattern of datePatterns) {
      if (pattern.test(col)) return col
    }
  }
  return null
}

function detectDateOutliers(rows: RawRow[], dateColumn: string): number[] {
  const dates = rows.map((row, idx) => ({ idx, date: row[dateColumn] }))
  const parsedDates = dates
    .map(d => ({ idx: d.idx, date: d.date ? new Date(d.date as string) : null }))
    .filter(d => d.date && !isNaN(d.date.getTime()))

  if (parsedDates.length < 2) return []

  // Find the most common year
  const yearCounts = new Map<number, number>()
  for (const d of parsedDates) {
    const year = d.date!.getFullYear()
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
  }
  let mostCommonYear = 0
  let maxCount = 0
  for (const [year, count] of yearCounts) {
    if (count > maxCount) {
      maxCount = count
      mostCommonYear = year
    }
  }

  // Find outliers (dates more than 1 year from the most common year)
  const outliers: number[] = []
  for (const d of parsedDates) {
    if (Math.abs(d.date!.getFullYear() - mostCommonYear) > 1) {
      outliers.push(d.idx)
    }
  }

  return outliers
}

function getMostCommonYear(rows: RawRow[], dateColumn: string): number {
  const years: number[] = []
  for (const row of rows) {
    const val = row[dateColumn]
    if (val) {
      const d = new Date(val as string)
      if (!isNaN(d.getTime())) years.push(d.getFullYear())
    }
  }
  if (years.length === 0) return new Date().getFullYear()
  const yearCounts = new Map<number, number>()
  for (const year of years) {
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
  }
  let mostCommonYear = 0
  let maxCount = 0
  for (const [year, count] of yearCounts) {
    if (count > maxCount) {
      maxCount = count
      mostCommonYear = year
    }
  }
  return mostCommonYear
}

function datesCount(rows: RawRow[], dateColumn: string): number {
  const dates = new Set<string>()
  for (const row of rows) {
    const val = row[dateColumn]
    if (val) {
      const d = new Date(val as string)
      if (!isNaN(d.getTime())) dates.add(d.toISOString().slice(0, 10))
    }
  }
  return dates.size
}

function detectEssentialColumns(columns: string[], researchQuestion: string): string[] {
  // If research question is provided, extract likely essential columns
  const essential: string[] = []
  const rq = researchQuestion.toLowerCase()

  // Based on typical epidemiological research questions
  const essentialMappings: Record<string, string[]> = {
    'risk factor': ['age', 'sex', 'gender', 'outcome', 'exposure'],
    'severity': ['age', 'sex', 'outcome', 'symptom', 'lab_result', 'comorbidity'],
    'outbreak': ['date', 'onset', 'age', 'sex', 'address', 'barangay', 'outcome'],
    'demographic': ['age', 'sex', 'gender', 'barangay', 'address', 'municipality'],
    'surveillance': ['date', 'report', 'case_classification', 'outcome'],
    'vaccine': ['vaccination', 'age', 'sex', 'outcome'],
    'response': ['date', 'admit', 'discharge', 'management', 'outcome'],
  }

  for (const [key, cols] of Object.entries(essentialMappings)) {
    if (rq.includes(key)) {
      for (const col of cols) {
        const matched = columns.find(c => c.toLowerCase().includes(col))
        if (matched && !essential.includes(matched)) essential.push(matched)
      }
    }
  }

  // Always include date columns if found
  const dateCol = findDateColumn(columns)
  if (dateCol && !essential.includes(dateCol)) essential.push(dateCol)

  // If no essential columns found, include all columns
  if (essential.length === 0) return columns

  return essential
}

function detectCategoricalColumns(rows: RawRow[], columns: string[]): string[] {
  const categorical: string[] = []
  for (const col of columns) {
    const values = rows.map(r => String(r[col] ?? '').trim()).filter(Boolean)
    if (values.length === 0) continue
    const unique = new Set(values)
    // If fewer than 20% unique values, it's likely categorical
    if (unique.size / values.length < 0.2) {
      categorical.push(col)
    }
  }
  return categorical
}

function detectValueVariations(uniqueValues: string[], column: string): string[] {
  const variations: string[] = []
  const commonMappings: Record<string, string[]> = {
    'sex': ['male', 'm', 'm/', 'm/', 'man', 'lalaki', 'laki', '1'],
    'female': ['female', 'f', 'f/', 'f/', 'woman', 'babae', '2'],
    'died': ['died', 'dead', 'death', 'expired', 'deceased', 'namatay', 'd'],
    'recovered': ['recovered', 'alive', 'discharged', 'gumaling', 'nabuhay', 'r'],
    'confirmed': ['confirmed', 'positive', 'kumpirmado', 'pos', 'c'],
    'probable': ['probable', 'malamang', 'p'],
    'suspect': ['suspect', 'suspected', 'pinaghihinalaang', 's'],
  }

  // Check for variations of common categories
  for (const [standard, variants] of Object.entries(commonMappings)) {
    const found = uniqueValues.filter(v => 
      variants.some(varv => varv.toLowerCase() === v.toLowerCase())
    )
    if (found.length > 1) {
      variations.push(...found)
    }
  }

  return variations
}

function createStandardizationMap(variations: string[], column: string): Record<string, string> {
  const map: Record<string, string> = {}
  const commonMappings: Record<string, string[]> = {
    'sex': ['male', 'm', 'man', 'lalaki', 'laki', '1'],
    'female': ['female', 'f', 'woman', 'babae', '2'],
    'died': ['died', 'dead', 'death', 'expired', 'deceased', 'namatay', 'd'],
    'recovered': ['recovered', 'alive', 'discharged', 'gumaling', 'nabuhay', 'r'],
    'confirmed': ['confirmed', 'positive', 'kumpirmado', 'pos', 'c'],
    'probable': ['probable', 'malamang', 'p'],
    'suspect': ['suspect', 'suspected', 'pinaghihinalaang', 's'],
  }

  let columnLower = column.toLowerCase()
  if (columnLower.includes('sex') || columnLower.includes('gender')) {
    for (const v of variations) {
      const lower = v.toLowerCase()
      if (['male', 'm', 'man', 'lalaki', 'laki', '1'].includes(lower)) map[v] = 'Male'
      else if (['female', 'f', 'woman', 'babae', '2'].includes(lower)) map[v] = 'Female'
      else map[v] = 'Unknown'
    }
  } else if (columnLower.includes('outcome') || columnLower.includes('status')) {
    for (const v of variations) {
      const lower = v.toLowerCase()
      if (['died', 'dead', 'death', 'expired', 'deceased', 'namatay', 'd'].includes(lower)) map[v] = 'Died'
      else if (['recovered', 'alive', 'discharged', 'gumaling', 'nabuhay', 'r'].includes(lower)) map[v] = 'Recovered'
      else map[v] = 'Unknown'
    }
  }

  return map
}

function detectNumericColumns(rows: RawRow[], columns: string[]): string[] {
  const numeric: string[] = []
  for (const col of columns) {
    const values = rows.map(r => Number(r[col])).filter(v => !isNaN(v))
    if (values.length > 0 && values.length / rows.length > 0.3) {
      numeric.push(col)
    }
  }
  return numeric
}

function findDuplicateRecords(rows: RawRow[], columns: string[]): number[][] {
  const groups: number[][] = []
  const seen = new Map<string, number>()

  // Only check rows that have values in all columns (or most columns)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Create a fingerprint of the row (exclude null/empty values)
    const fingerprint = columns
      .filter(c => row[c] !== null && row[c] !== undefined && row[c] !== '')
      .map(c => String(row[c]).trim())
      .join('|')
    
    if (!fingerprint) continue

    if (seen.has(fingerprint)) {
      const group = seen.get(fingerprint)!
      if (!groups[group]) groups[group] = [seen.get(fingerprint)!]
      groups[group].push(i)
    } else {
      seen.set(fingerprint, groups.length)
      groups.push([i])
    }
  }

  // Return only groups with more than one record
  return groups.filter(g => g.length > 1)
}

function findIrrelevantColumns(columns: string[], researchQuestion: string): string[] {
  if (!researchQuestion || researchQuestion.trim() === '') return []

  const rq = researchQuestion.toLowerCase()
  const relevantTerms = new Set<string>()

  // Extract key terms from research question
  const words = rq.split(/\s+/)
  for (const word of words) {
    if (word.length > 3) relevantTerms.add(word)
  }

  // Add common epidemiological terms
  const epiTerms = ['age', 'sex', 'gender', 'date', 'onset', 'outcome', 'case', 'exposure', 'risk', 'factor', 'symptom', 'lab', 'result', 'vaccine', 'treatment', 'management', 'address', 'barangay', 'municipality', 'province', 'region', 'outbreak', 'cluster', 'surveillance', 'report', 'admit', 'discharge']
  for (const term of epiTerms) relevantTerms.add(term)

  // Check which columns are relevant
  const irrelevant: string[] = []
  for (const col of columns) {
    const colLower = col.toLowerCase()
    let isRelevant = false
    for (const term of relevantTerms) {
      if (colLower.includes(term)) {
        isRelevant = true
        break
      }
    }
    // Also check if the column contains the research question terms
    if (!isRelevant) {
      for (const word of words) {
        if (word.length > 3 && colLower.includes(word)) {
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

  // Check first few columns for test patterns
  const checkColumns = columns.slice(0, Math.min(5, columns.length))
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    for (const col of checkColumns) {
      const val = String(row[col] ?? '').trim()
      if (testPatterns.test(val)) {
        testRows.push(i)
        break
      }
    }
  }

  return testRows
}
