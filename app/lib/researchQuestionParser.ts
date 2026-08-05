// Research Question Parser - 100% client-side, no data leaves the browser
// Parses research questions to identify required columns for analysis

export interface RequiredColumn {
  name: string
  reason: string
  aliases: string[]
}

export interface AdequacyResult {
  isAdequate: boolean
  requiredColumns: RequiredColumn[]
  missingColumns: string[]
  flaggedColumns: string[] // columns needed but marked for removal
  warnings: string[]
  suggestions: string[]
  allAvailableColumns: string[]
  keptColumns: string[]
  removeColumns: string[]
}

export interface ColumnRequirement {
  pattern: RegExp
  columns: Omit<RequiredColumn, 'aliases'>[]
  description: string
}

// Define column requirements based on research question patterns
const COLUMN_REQUIREMENTS: ColumnRequirement[] = [
  // Attack rate by location
  {
    pattern: /attack rate|attackrate|attack-rate|by\s+(barangay|municipality|city|town|province|region|location|area|geographic)/i,
    description: 'Attack rate analysis requires location grouping and case counts',
    columns: [
      { name: 'barangay', reason: 'Attack rate requires grouping by location (barangay/municipality)' },
      { name: 'municipality', reason: 'Attack rate requires grouping by location (municipality/city)' },
      { name: 'date', reason: 'Attack rate requires case counts over a defined time period' },
      { name: 'onset', reason: 'Date of symptom onset is the standard for case counting' },
      { name: 'age', reason: 'Age stratification is recommended for attack rate analysis' },
    ],
  },
  // Epidemic curve
  {
    pattern: /epidemic curve|epi curve|outbreak curve|temporal|time series|by date|over time|trend|peak|wave|daily cases|weekly cases/i,
    description: 'Epidemic curve requires dates for time-series plotting',
    columns: [
      { name: 'date', reason: 'Epidemic curve requires dates for plotting cases over time' },
      { name: 'onset', reason: 'Date of symptom onset is the standard for epidemic curves' },
      { name: 'age', reason: 'Age stratification helps identify vulnerable populations' },
    ],
  },
  // Age-sex pyramid / Demographic
  {
    pattern: /age.*sex|demographic profile|age distribution|sex distribution|pyramid|demographic|age group|by age|by sex|by gender|male female/i,
    description: 'Demographic analysis requires age and sex variables',
    columns: [
      { name: 'age', reason: 'Age is required for demographic profiling' },
      { name: 'sex', reason: 'Sex/gender is required for demographic profiling' },
      { name: 'gender', reason: 'Sex/gender is required for demographic profiling' },
    ],
  },
  // Risk factors
  {
    pattern: /risk factor|associated with|predictor|determinant|correlate|contributing factor|influencing|risk|exposure/i,
    description: 'Risk factor analysis requires outcome and exposure variables',
    columns: [
      { name: 'age', reason: 'Age is a common risk factor in epidemiological analysis' },
      { name: 'sex', reason: 'Sex is a common risk factor in epidemiological analysis' },
      { name: 'gender', reason: 'Gender is a common risk factor in epidemiological analysis' },
      { name: 'outcome', reason: 'Outcome/status variable is required for risk factor analysis' },
      { name: 'exposure', reason: 'Exposure variables are needed for risk factor analysis' },
    ],
  },
  // Outcome / Survival / Severity
  {
    pattern: /outcome|survival|died|recovered|hospitalized|admitted|severity|mortality|cases|deaths|case fatality|cfr|fatal|nonfatal/i,
    description: 'Outcome analysis requires outcome variable and relevant dates',
    columns: [
      { name: 'outcome', reason: 'Outcome variable (died/alive/recovered) is required for this analysis' },
      { name: 'date', reason: 'Dates are needed for time-to-event or severity analysis' },
      { name: 'onset', reason: 'Onset date is needed for time-to-event analysis' },
      { name: 'admit', reason: 'Admission date may be needed for hospitalization/severity analysis' },
    ],
  },
  // Symptoms / Clinical
  {
    pattern: /symptom|clinical|presentation|fever|cough|sore throat|headache|rash|sign|manifestation|illness|disease presentation/i,
    description: 'Symptom analysis requires symptom variables',
    columns: [
      { name: 'symptom', reason: 'Symptom data is required for clinical presentation analysis' },
      { name: 'fever', reason: 'Fever is a key symptom for ILI case definition' },
      { name: 'cough', reason: 'Cough is a key symptom for ILI case definition' },
      { name: 'age', reason: 'Age may be needed for symptom pattern analysis' },
    ],
  },
  // Surveillance / Reporting
  {
    pattern: /surveillance|reporting|notification|detect|monitor|track|weekly|monthly|surveillance/i,
    description: 'Surveillance analysis requires reporting and date variables',
    columns: [
      { name: 'date', reason: 'Date of reporting is required for surveillance analysis' },
      { name: 'onset', reason: 'Date of symptom onset is needed for surveillance epidemiology' },
      { name: 'report', reason: 'Date of report/notification is needed for surveillance timeliness' },
      { name: 'case_classification', reason: 'Case classification (confirmed/probable/suspect) is needed for surveillance' },
    ],
  },
  // Laboratory / Diagnostics
  {
    pattern: /lab|specimen|test|pcr|rapid|antigen|antibody|diagnostic|positive|negative|result|confirm/i,
    description: 'Laboratory analysis requires lab result variables',
    columns: [
      { name: 'lab_result', reason: 'Laboratory result is required for diagnostic analysis' },
      { name: 'lab_specimen', reason: 'Specimen type/date is needed for lab analysis' },
      { name: 'date', reason: 'Date of specimen collection is needed for lab analysis' },
    ],
  },
]

// Column aliases for flexible matching
const COLUMN_ALIASES: Record<string, string[]> = {
  'barangay': ['barangay', 'brgy', 'brgy.', 'village', 'zone', 'district', 'purok', 'address', 'location', 'barangay/zone'],
  'municipality': ['municipality', 'mun', 'mun.', 'city', 'town', 'local government', 'lgu', 'municipality/city'],
  'province': ['province', 'prov', 'prov.', 'region', 'provincial'],
  'date': ['date', 'report date', 'consult date', 'admission date', 'discharge date', 'date collected', 'onset', 'date of onset'],
  'onset': ['onset', 'date of onset', 'symptom onset', 'start date', 'symptoms started', 'date start', 'date_onset'],
  'age': ['age', 'age group', 'age category', 'age in years', 'patient age', 'yrs', 'year', 'age_years', 'age (years)'],
  'sex': ['sex', 'sex/gender', 'male/female', 'male', 'female', 'gender_male', 'gender_female'],
  'gender': ['gender', 'sex', 'sex/gender', 'male/female', 'male', 'female', 'gender (male/female)'],
  'outcome': ['outcome', 'status', 'final outcome', 'patient outcome', 'died/alive', 'recovered', 'death', 'survival', 'case status'],
  'symptom': ['symptom', 'symptoms', 'signs', 'presentation', 'clinical', 'fever', 'cough', 'sore throat', 'headache'],
  'fever': ['fever', 'temp', 'temperature', 'feverish', 'fever (y/n)', 'fever_yn'],
  'cough': ['cough', 'coughing', 'cough (y/n)', 'cough_yn'],
  'exposure': ['exposure', 'exposure history', 'contact', 'contact with', 'travel', 'source', 'exposure_yn', 'contact_yn'],
  'admit': ['admit', 'admitted', 'hospitalization', 'hospitalized', 'admission', 'seen', 'hospitalized (y/n)', 'admitted_yn'],
  'report': ['report', 'date report', 'notification', 'date notified', 'report date', 'date_reported'],
  'lab_result': ['lab result', 'lab_result', 'result', 'test result', 'pcr result', 'rapid result', 'positive/negative'],
  'lab_specimen': ['specimen', 'lab specimen', 'specimen type', 'date collected', 'collection date'],
  'case_classification': ['case classification', 'classification', 'case_status', 'status', 'confirmed/probable/suspect'],
}

function findMatchingColumn(columnNames: string[], targetName: string): string | null {
  const aliases = COLUMN_ALIASES[targetName] || [targetName]
  const lowerTarget = targetName.toLowerCase()

  // Check for exact matches first
  for (const alias of aliases) {
    const lowerAlias = alias.toLowerCase()
    for (const col of columnNames) {
      const lowerCol = col.toLowerCase().trim()
      if (lowerCol === lowerAlias) {
        return col
      }
    }
  }

  // Check for partial matches (contains)
  for (const alias of aliases) {
    const lowerAlias = alias.toLowerCase()
    for (const col of columnNames) {
      const lowerCol = col.toLowerCase().trim()
      if (lowerCol.includes(lowerAlias) || lowerAlias.includes(lowerCol)) {
        return col
      }
    }
  }

  return null
}

export function parseResearchQuestion(
  question: string,
  allColumnNames: string[],
  keptColumns: string[] = [],
  removedColumns: string[] = []
): AdequacyResult {
  const rq = question.toLowerCase().trim()
  const warnings: string[] = []
  const suggestions: string[] = []
  const requiredColumns: RequiredColumn[] = []
  const missingColumns: string[] = []
  const flaggedColumns: string[] = []

  if (!rq || rq.length < 5) {
    return {
      isAdequate: true, // No RQ means no requirements
      requiredColumns: [],
      missingColumns: [],
      flaggedColumns: [],
      warnings: ['No research question provided. Quality check will run in generic mode.'],
      suggestions: ['Enter a research question for more targeted cleaning suggestions.'],
      allAvailableColumns: allColumnNames,
      keptColumns: keptColumns,
      removeColumns: removedColumns,
    }
  }

  // Find matching patterns
  let matched = false
  const matchedRequirements: RequiredColumn[] = []
  const matchedDescriptions: string[] = []

  for (const requirement of COLUMN_REQUIREMENTS) {
    if (requirement.pattern.test(rq)) {
      matched = true
      matchedDescriptions.push(requirement.description)
      for (const col of requirement.columns) {
        // Check if this column is already in the list (avoid duplicates)
        const existing = matchedRequirements.find(c => c.name === col.name)
        if (!existing) {
          matchedRequirements.push({
            name: col.name,
            reason: col.reason,
            aliases: COLUMN_ALIASES[col.name] || [col.name],
          })
        }
      }
    }
  }

  // If no specific pattern matched, use generic requirements
  if (!matched) {
    warnings.push('We could not automatically identify your analysis type from the research question.')
    suggestions.push('Try using phrases like "epidemic curve", "attack rate", "risk factors", or "demographic profile" to get more targeted column requirements.')
    
    // Add generic requirements
    const genericColumns = [
      { name: 'date', reason: 'Most epidemiological analyses require dates for time-based analysis' },
      { name: 'onset', reason: 'Date of symptom onset is commonly needed for epidemiological analysis' },
      { name: 'age', reason: 'Age is a fundamental variable in epidemiological analysis' },
      { name: 'outcome', reason: 'Outcome/status is commonly needed for epidemiological analysis' },
    ]
    for (const col of genericColumns) {
      const existing = matchedRequirements.find(c => c.name === col.name)
      if (!existing) {
        matchedRequirements.push({
          name: col.name,
          reason: col.reason,
          aliases: COLUMN_ALIASES[col.name] || [col.name],
        })
      }
    }
  } else {
    // Add a success message
    if (matchedDescriptions.length > 0) {
      suggestions.push(`Detected analysis: ${matchedDescriptions.join(', ')}`)
    }
  }

  // Now check each required column against the actual dataset
  const availableColumnSet = new Set(allColumnNames.map(c => c.toLowerCase().trim()))
  const keptColumnSet = new Set(keptColumns.map(c => c.toLowerCase().trim()))
  const removedColumnSet = new Set(removedColumns.map(c => c.toLowerCase().trim()))

  for (const req of matchedRequirements) {
    const found = findMatchingColumn(allColumnNames, req.name)
    
    if (found) {
      // Column exists in dataset - check if it's being removed
      const foundLower = found.toLowerCase().trim()
      if (removedColumnSet.has(foundLower)) {
        flaggedColumns.push(found)
      }
      requiredColumns.push({
        ...req,
        aliases: COLUMN_ALIASES[req.name] || [req.name],
      })
    } else {
      // Column not found
      missingColumns.push(req.name)
      requiredColumns.push({
        ...req,
        aliases: COLUMN_ALIASES[req.name] || [req.name],
      })
    }
  }

  // Determine if dataset is adequate
  const hasCriticalMissing = missingColumns.some(name => 
    ['date', 'onset', 'barangay', 'age', 'outcome'].includes(name.toLowerCase())
  )
  
  const isAdequate = missingColumns.length === 0 && flaggedColumns.length === 0

  // Additional suggestions
  if (missingColumns.length > 0) {
    suggestions.push(`Add these columns to your dataset: ${missingColumns.join(', ')}`)
  }
  if (flaggedColumns.length > 0) {
    suggestions.push(`Move these columns to KEEP (they are needed for your analysis): ${flaggedColumns.join(', ')}`)
  }
  if (hasCriticalMissing && missingColumns.length > 0) {
    warnings.push(`Critical columns missing: ${missingColumns.filter(c => ['date', 'onset', 'barangay', 'age', 'outcome'].includes(c.toLowerCase())).join(', ')}. Your analysis may not work.`)
  }

  return {
    isAdequate,
    requiredColumns,
    missingColumns,
    flaggedColumns,
    warnings,
    suggestions,
    allAvailableColumns: allColumnNames,
    keptColumns,
    removeColumns: removedColumns,
  }
}

// Export for use in other modules
export function getColumnAliases(): Record<string, string[]> {
  return COLUMN_ALIASES
}

export function getRequirementPatterns(): ColumnRequirement[] {
  return COLUMN_REQUIREMENTS
}
