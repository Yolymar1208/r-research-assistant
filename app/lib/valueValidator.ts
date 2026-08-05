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
  const missingRows = values
    .map((v, idx) => ({ idx, val: v }))
    .filter(v => v.val === null || v.val === undefined || v.val === '')
    .map(v => v.idx)

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
    const numbers = values.filter(v => typeof v === 'number')
    if (numbers.length > 0) {
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
      const std = Math.sqrt(numbers.reduce((a, b) => a + (b - mean) ** 2, 0) / numbers.length)
      
      // Check for out-of-range values
      const validRange = getValidRange(column)
      if (validRange) {
        const outOfRange = values
          .map((v, idx) => ({ idx, val: v }))
          .filter(v => typeof v.val === 'number' && (v.val < validRange.min || v.val > validRange.max))
          .map(v => v.idx)
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
      const outliers = numbers
        .map((v, idx) => ({ idx, val: v }))
        .filter(v => Math.abs(v.val - mean) > 3 * std)
        .map(v => v.idx)
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
    const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined && v !== '').map(v => String(v)))
    const valueCounts = new Map<string, number>()
    for (const v of values) {
      if (v !== null && v !== undefined && v !== '') {
        const key = String(v)
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1)
      }
    }

    // Check for inconsistent casing or variations
    const variations = new Map<string, string[]>()
    for (const [key] of valueCounts) {
      const lower = key.toLowerCase()
      if (!variations.has(lower)) variations.set(lower, [])
      variations.get(lower)!.push(key)
    }
    for (const [lower, variants] of variations) {
      if (variants.length > 1) {
        issues.push({
          type: 'inconsistent',
          severity: 'warning',
          description: `Inconsistent casing/variations: ${variants.slice(0, 3).join(', ')}${variants.length > 3 ? ` +${variants.length - 3} more` : ''}`,
          affectedRows: values
            .map((v, idx) => ({ idx, val: v }))
            .filter(v => v !== null && v !== undefined && v !== '' && variants.includes(String(v)))
            .map(v => v.idx),
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
