// Check which columns are relevant to the research question

export interface RelevanceResult {
  column: string
  relevant: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export function checkColumnRelevance(
  columns: string[],
  researchQuestion: string
): RelevanceResult[] {
  if (!researchQuestion || researchQuestion.trim() === '') {
    return columns.map(col => ({
      column: col,
      relevant: true,
      confidence: 'low',
      reason: 'No research question provided, keeping all columns',
    }))
  }

  const results: RelevanceResult[] = []
  const rq = researchQuestion.toLowerCase()
  const rqWords = rq.split(/\s+/).filter(w => w.length > 3)

  // Domain-specific relevance mappings
  const domainTerms: Record<string, string[]> = {
    // Always keep these for epidemiological analysis
    'always_keep': ['age', 'sex', 'gender', 'date', 'onset', 'outcome', 'case', 'id', 'number'],
    
    // Demographic
    'demographic': ['age', 'sex', 'gender', 'address', 'barangay', 'municipality', 'province', 'region'],
    
    // Clinical
    'clinical': ['symptom', 'sign', 'fever', 'cough', 'sore throat', 'headache', 'rash', 'diarrhea', 'vomiting'],
    
    // Lab
    'lab': ['lab', 'specimen', 'result', 'test', 'pcr', 'rapid', 'antigen', 'antibody'],
    
    // Exposure
    'exposure': ['exposure', 'travel', 'contact', 'risk', 'source'],
    
    // Outcome
    'outcome': ['outcome', 'status', 'died', 'recovered', 'discharge', 'admit', 'hospitalization'],
    
    // Management
    'management': ['treatment', 'medication', 'management', 'therapy', 'vaccine', 'vaccination'],
    
    // Surveillance
    'surveillance': ['report', 'notify', 'week', 'epi', 'cluster'],
  }

  for (const col of columns) {
    const colLower = col.toLowerCase()
    let relevant = false
    let confidence: 'high' | 'medium' | 'low' = 'low'
    let reason = ''

    // Check if column is in "always keep" list
    for (const term of domainTerms.always_keep) {
      if (colLower.includes(term)) {
        relevant = true
        confidence = 'high'
        reason = 'Essential for epidemiological analysis'
        break
      }
    }

    if (!relevant) {
      // Check if column matches research question terms
      let matches = 0
      for (const word of rqWords) {
        if (colLower.includes(word)) {
          matches++
        }
      }
      if (matches > 0) {
        relevant = true
        confidence = matches >= 2 ? 'high' : 'medium'
        reason = `Matches ${matches} term${matches > 1 ? 's' : ''} in research question`
      }
    }

    if (!relevant) {
      // Check domain-specific terms
      for (const [domain, terms] of Object.entries(domainTerms)) {
        if (domain === 'always_keep') continue
        for (const term of terms) {
          if (colLower.includes(term)) {
            // Check if the domain appears in the research question
            if (rq.includes(domain) || rq.includes(term)) {
              relevant = true
              confidence = 'medium'
              reason = `Matches domain: ${domain} (appears in research question)`
              break
            }
            // If domain not in RQ, lower confidence
            if (!relevant) {
              relevant = true
              confidence = 'low'
              reason = `Matches domain: ${domain} (not explicitly mentioned in research question)`
            }
          }
        }
        if (relevant) break
      }
    }

    // If still not relevant, mark as irrelevant
    if (!relevant) {
      results.push({
        column: col,
        relevant: false,
        confidence: 'low',
        reason: 'Does not appear to be relevant to the research question',
      })
    } else {
      results.push({
        column: col,
        relevant: true,
        confidence,
        reason,
      })
    }
  }

  return results
}

export function getEssentialColumns(
  columns: string[],
  researchQuestion: string
): string[] {
  const results = checkColumnRelevance(columns, researchQuestion)
  return results.filter(r => r.relevant && r.confidence !== 'low').map(r => r.column)
}

export function getOptionalColumns(
  columns: string[],
  researchQuestion: string
): string[] {
  const results = checkColumnRelevance(columns, researchQuestion)
  return results.filter(r => r.relevant && r.confidence === 'low').map(r => r.column)
}

export function getIrrelevantColumns(
  columns: string[],
  researchQuestion: string
): string[] {
  const results = checkColumnRelevance(columns, researchQuestion)
  return results.filter(r => !r.relevant).map(r => r.column)
}
