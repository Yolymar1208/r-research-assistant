export function applyCleaningSteps(
  rows: RawRow[],
  steps: CleaningStep[]
): RawRow[] {
  let result = [...rows]
  const columnRenames: Record<string, string> = {}
  const columnsToRemove = new Set<string>()

  for (const step of steps) {
    if (step.status !== 'accepted') continue

    if (step.type === 'remove_columns') {
      const cols = step.payload.columns as string[]
      cols.forEach(c => columnsToRemove.add(c))
    }

    if (step.type === 'remove_rows') {
      const rowIndices = step.payload.rowIndices as number[]
      const indicesToRemove = new Set(rowIndices)
      result = result.filter((_, idx) => !indicesToRemove.has(idx))
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

    if (step.type === 'correct_date') {
      const col = step.payload.column as string
      const targetYear = step.payload.targetYear as number
      const rowIndices = step.payload.rowIndices as number[]
      const indices = new Set(rowIndices)
      result = result.map((row, idx) => {
        if (indices.has(idx) && row[col]) {
          const corrected = correctDateOutlier(String(row[col]), targetYear)
          return { ...row, [col]: corrected }
        }
        return row
      })
    }

    // FIXED: Handle rename_columns properly
    if (step.type === 'rename_columns') {
      const from = step.payload.from as string
      const to = step.payload.to as string
      // Apply rename immediately, not deferred
      result = result.map(row => {
        const newRow = { ...row }
        if (newRow[from] !== undefined) {
          newRow[to] = newRow[from]
          delete newRow[from]
        }
        return newRow
      })
      // Remove the old column from the removal set if it was there
      columnsToRemove.delete(from)
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

    if (step.type === 'deduplicate') {
      const rowIndices = step.payload.rowIndices as number[]
      const indicesToRemove = new Set(rowIndices)
      result = result.filter((_, idx) => !indicesToRemove.has(idx))
    }

    if (step.type === 'convert_type') {
      const col = step.payload.column as string
      const targetType = step.payload.targetType as string
      result = result.map(row => {
        const newRow = { ...row }
        if (targetType === 'number') {
          newRow[col] = Number(row[col])
        } else if (targetType === 'string') {
          newRow[col] = String(row[col] ?? '')
        }
        return newRow
      })
    }

    if (step.type === 'fill_missing') {
      const col = step.payload.column as string
      const fillValue = step.payload.fillValue
      const rowIndices = step.payload.rowIndices as number[]
      const indices = new Set(rowIndices)
      result = result.map((row, idx) => {
        if (indices.has(idx) && (row[col] === null || row[col] === undefined || row[col] === '')) {
          return { ...row, [col]: fillValue }
        }
        return row
      })
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

  return result
}
