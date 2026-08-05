// Validate values against expectations

export interface ValidationResult {
  column: string
  valid: boolean
  issues: ValidationIssue[]
}

export interface ValidationIssue {
  type: 'out_of_range' | 'unlikely' | 'inconsistent' | 'missing'
  severity: 'critical' | 'warning' | 'info'
  description: string
  affectedRows: number[]
  suggestedFix: string
}

export function validateColumn(
  column: string,
  values: any[],
  columnType: 'numeric' | 'categorical' | 'date' | 'text'
): ValidationResult {
  const issues: ValidationIssue[] = []

  // Check for missing values
  const missingRows: number[] = []
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v === null || v === undefined || v === '') {
      missingRows.push(i)
    }
  }

  if (missingRows.length > 0) {
    issues.push({
      type: 'missing',
      severity: missingRows.length / values.length > 0.3 ? 'critical' : 'warning',
      description: `${missingRows.length} missing value${missingRows.length > 1 ? 's' : ''} (${Math.round(missingRows.length / values.length * 100)}%)`,
      affectedRows: missingRows,
      suggestedFix: missingRows.length / values.length > 0.3
        ? 'Consider removing this column or imputing missing values'
        : `Remove ${missingRows.length} row${missingRows.length > 1 ? 's' : ''}`,
    })
  }

  if (columnType === 'numeric') {
    const numbers: number[] = []
    for (let i = 0; i < values.length; i++) {
      if (typeof values[i] === 'number') numbers.push(values[i])
    }
    if (numbers.length > 0) {
      let sum = 0
      for (let i = 0; i < numbers.length; i++) {
        sum += numbers[i]
      }
      const mean = sum / numbers.length
      let squaredDiffSum = 0
      for (let i = 0; i < numbers.length; i++) {
        squaredDiffSum += (numbers[i] - mean) ** 2
      }
      const std = Math.sqrt(squaredDiffSum / numbers.length)
      
      // Check for out-of-range values
      const validRange = getValidRange(column)
      if (validRange) {
        const outOfRange: number[] = []
        for (let i = 0; i < values.length; i++) {
          if (typeof values[i] === 'number' && (values[i] < validRange.min || values[i] > validRange.max)) {
            outOfRange.push(i)
          }
        }
        if (outOfRange.length > 0) {
          issues.push({
            type: 'out_of_range',
            severity: 'critical',
            description: `${outOfRange.length} value${outOfRange.length > 1 ? 's' : ''} outside expected range (${validRange.min}–${validRange.max})`,
            affectedRows: outOfRange,
            suggestedFix: `Review and correct these ${outOfRange.length} value${outOfRange.length > 1 ? 's' : ''}`,
          })
        }
      }

      // Check for outliers (3 standard deviations)
      const outliers: number[] = []
      for (let i = 0; i < numbers.length; i++) {
        if (Math.abs(numbers[i] - mean) > 3 * std) {
          outliers.push(i)
        }
      }
      if (outliers.length > 0) {
        issues.push({
          type: 'unlikely',
          severity: 'warning',
          description: `${outliers.length} statistical outlier${outliers.length > 1 ? 's' : ''} (beyond 3 standard deviations)`,
          affectedRows: outliers,
          suggestedFix: `Review these ${outliers.length} value${outliers.length > 1 ? 's' : ''}`,
        })
      }
    }
  }

  if (columnType === 'categorical') {
    const uniqueValues = new Set<string>()
    const valueCounts = new Map<string, number>()
    
    for (let i = 0; i < values.length; i++) {
      const v = values[i]
      if (v !== null && v !== undefined && v !== '') {
        const key = String(v)
        if (!uniqueValues.has(key)) uniqueValues.add(key)
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1)
      }
    }

    // Check for inconsistent casing or variations
    const variations = new Map<string, string[]>()
    // FIXED: Use Array.from() to iterate over Map entries
    const valueCountsEntries = Array.from(valueCounts.entries())
    for (let i = 0; i < valueCountsEntries.length; i++) {
      const [key] = valueCountsEntries[i]
      const lower = key.toLowerCase()
      if (!variations.has(lower)) variations.set(lower, [])
      const arr = variations.get(lower)
      if (arr) arr.push(key)
    }
    
    const variationsEntries = Array.from(variations.entries())
    for (let i = 0; i < variationsEntries.length; i++) {
      const [lower, variants] = variationsEntries[i]
      if (variants.length > 1) {
        const affectedRows: number[] = []
        for (let j = 0; j < values.length; j++) {
          const v = values[j]
          if (v !== null && v !== undefined && v !== '' && variants.includes(String(v))) {
            affectedRows.push(j)
          }
        }
        issues.push({
          type: 'inconsistent',
          severity: 'warning',
          description: `Inconsistent casing/variations: ${variants.slice(0, 3).join(', ')}${variants.length > 3 ? ` +${variants.length - 3} more` : ''}`,
          affectedRows: affectedRows,
          suggestedFix: `Standardize to: ${variants[0].toLowerCase()}`,
        })
      }
    }
  }

  return {
    column,
    valid: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
  }
}

function getValidRange(column: string): { min: number; max: number } | null {
  const colLower = column.toLowerCase()
  if (colLower.includes('age')) return { min: 0, max: 120 }
  if (colLower.includes('temp') || colLower.includes('temperature')) return { min: 30, max: 45 }
  if (colLower.includes('pulse') || colLower.includes('heart')) return { min: 30, max: 200 }
  if (colLower.includes('resp') || colLower.includes('breath')) return { min: 5, max: 60 }
  if (colLower.includes('bp') || colLower.includes('blood_pressure')) return { min: 50, max: 250 }
  if (colLower.includes('weight')) return { min: 1, max: 300 }
  if (colLower.includes('height')) return { min: 30, max: 250 }
  if (colLower.includes('bmi')) return { min: 10, max: 60 }
  return null
}
