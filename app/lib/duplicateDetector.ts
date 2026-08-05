// Detect duplicate records

export interface DuplicateGroup {
  rowIndices: number[]
  fingerprint: string
  sampleData: Record<string, unknown>
}

export interface DuplicateResult {
  groups: DuplicateGroup[]
  totalDuplicates: number
  totalRowsAffected: number
}

export function detectDuplicates(
  rows: Record<string, unknown>[],
  columns: string[],
  threshold: number = 0.8
): DuplicateResult {
  const groups: DuplicateGroup[] = []
  const seen = new Map<string, number>()
  const fingerprints: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Create fingerprint from non-empty columns
    const fingerprintParts: string[] = []
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j]
      if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
        fingerprintParts.push(String(row[col]).trim().toLowerCase())
      }
    }
    const fingerprint = fingerprintParts.join('|')
    
    if (!fingerprint) {
      fingerprints.push('')
      continue
    }

    // Check for partial matches (fuzzy)
    let matched = false
    // FIXED: Use Array.from() to iterate over Map entries
    const entries = Array.from(seen.entries())
    for (let k = 0; k < entries.length; k++) {
      const [existingFingerprint, groupIndex] = entries[k]
      const similarity = calculateSimilarity(fingerprint, existingFingerprint)
      if (similarity >= threshold) {
        groups[groupIndex].rowIndices.push(i)
        matched = true
        break
      }
    }

    if (!matched) {
      seen.set(fingerprint, groups.length)
      groups.push({
        rowIndices: [i],
        fingerprint,
        sampleData: row,
      })
    }
    fingerprints.push(fingerprint)
  }

  // Filter out groups with only one record
  const duplicateGroups: DuplicateGroup[] = []
  let totalDuplicates = 0
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].rowIndices.length > 1) {
      duplicateGroups.push(groups[i])
      totalDuplicates += groups[i].rowIndices.length
    }
  }
  const totalRowsAffected = duplicateGroups.reduce((sum, g) => sum + (g.rowIndices.length - 1), 0)

  return {
    groups: duplicateGroups,
    totalDuplicates,
    totalRowsAffected,
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1
  if (!str1 || !str2) return 0

  // Jaccard similarity on tokens
  const tokens1Arr = str1.split('|')
  const tokens2Arr = str2.split('|')
  const tokens1 = new Set(tokens1Arr)
  const tokens2 = new Set(tokens2Arr)
  
  // Calculate intersection
  let intersectionCount = 0
  const tokens1Array = Array.from(tokens1)
  for (let i = 0; i < tokens1Array.length; i++) {
    if (tokens2.has(tokens1Array[i])) {
      intersectionCount++
    }
  }
  
  // Calculate union
  const unionSet = new Set([...Array.from(tokens1), ...Array.from(tokens2)])
  
  return intersectionCount / unionSet.size
}
