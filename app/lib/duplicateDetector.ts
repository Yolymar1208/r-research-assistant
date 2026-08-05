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
    const fingerprint = columns
      .filter(c => row[c] !== null && row[c] !== undefined && row[c] !== '')
      .map(c => String(row[c]).trim().toLowerCase())
      .join('|')
    
    if (!fingerprint) {
      fingerprints.push('')
      continue
    }

    // Check for partial matches (fuzzy)
    let matched = false
    for (const [existingFingerprint, groupIndex] of seen) {
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
  const duplicateGroups = groups.filter(g => g.rowIndices.length > 1)
  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.rowIndices.length, 0)
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
  const tokens1 = new Set(str1.split('|'))
  const tokens2 = new Set(str2.split('|'))
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])
  return intersection.size / union.size
}
