// Client-side only. Classifies columns as PHI (remove) or analysis-safe (keep)
// based on DOH CIF / WHO line list field patterns.
// Row data never leaves the browser — only column names are inspected here.

export type ColumnClass = 'phi' | 'keep' | 'review'

export interface ColumnClassification {
  name: string
  cleanName: string
  classification: ColumnClass
  reason: string
  specialAction?: 'convert_age' | 'keep_barangay_only' | 'hash_id'
}

// DOH CIF Part 1 — PHI fields (remove by default)
const PHI_PATTERNS = [
  // Names
  /\b(last_?name|first_?name|middle_?name|surname|given_?name|full_?name|patient_?name|name)\b/i,
  // Dates of birth
  /\b(birthday|birth_?date|dob|date_?of_?birth|birth_?day)\b/i,
  // Contact info
  /\b(phone|cellphone|mobile|telephone|contact_?number|cp_?number)\b/i,
  /\b(email|e_?mail|email_?address)\b/i,
  // Address (granular)
  /\b(house_?no|lot_?no|unit_?no|bldg|street|purok|sitio|sityo|block|phase)\b/i,
  /\b(home_?address|complete_?address|residential_?address|address_?line)\b/i,
  // Government IDs
  /\b(philhealth|phic|sss|gsis|tin|prc|postal_?id|umid)\b/i,
  /\b(passport|national_?id|voter_?id|driver_?license|license_?no)\b/i,
  // Biometrics / other identifiers
  /\b(fingerprint|photo|picture|image|signature|face)\b/i,
  // Free-text fields that likely contain names
  /\b(respondent|informant|guardian|caregiver|emergency_?contact)\b/i,
  // Google Forms metadata
  /^(timestamp|email_?address)$/i,
  // REDCap metadata
  /^(responseid|ipaddress|startdate|enddate|progress|duration|recordeddate)$/i,
]

// DOH CIF Part 2 — Analysis-ready fields (keep by default)
const KEEP_PATTERNS = [
  // Identifiers (de-identified)
  /\b(case_?id|record_?no|epi_?no|patient_?no|study_?id|participant_?id|subject_?id)\b/i,
  // Age (not birthday)
  /\b(age|age_?group|age_?bracket|age_?category)\b/i,
  // Sex / gender
  /\b(sex|gender)\b/i,
  // Geography (barangay-level and above — not house/street)
  /\b(barangay|brgy|municipality|municipio|city|province|region|district|zone|area)\b/i,
  // Dates (onset, consult, admit — not birthday)
  /\b(date_?onset|onset_?date|date_?of_?onset|symptom_?onset)\b/i,
  /\b(date_?consult|consultation_?date|date_?of_?consult)\b/i,
  /\b(date_?admit|admission_?date|date_?of_?admission|date_?in)\b/i,
  /\b(date_?discharge|discharge_?date|date_?out)\b/i,
  /\b(date_?report|reporting_?date|date_?of_?report)\b/i,
  /\b(date_?death|death_?date|date_?of_?death)\b/i,
  /\b(date_?outcome|outcome_?date)\b/i,
  // Epidemiological week
  /\b(epi_?week|morbidity_?week|week_?no|reporting_?week)\b/i,
  // Case classification
  /\b(case_?class|classification|case_?status|disease_?class)\b/i,
  // Clinical data
  /\b(symptom|sign|complaint|diagnosis|disease|condition|illness)\b/i,
  /\b(fever|cough|colds|diarrhea|vomiting|rash|headache|dyspnea|sore_?throat)\b/i,
  /\b(comorbid|comorbidity|underlying|chronic|hypertension|diabetes|asthma)\b/i,
  // Vaccination
  /\b(vacc|vaccin|immuniz|dose|booster)\b/i,
  // Exposure / contact
  /\b(exposure|contact|travel|history)\b/i,
  // Laboratory
  /\b(lab|specimen|sample|test|result|pcr|antigen|antibody|culture|rdt)\b/i,
  // Outcome
  /\b(outcome|status|condition_?on_?discharge|alive|dead|death|died|recover)\b/i,
  // Facility
  /\b(dru|facility|hospital|clinic|reporting_?unit|health_?center)\b/i,
  // PIDSR-specific
  /\b(pidsr_?code|morbidity_?week|icd_?code|disease_?code)\b/i,
]

// Special cases that need transformation rather than simple remove/keep
const SPECIAL_CASES: { pattern: RegExp; action: ColumnClassification['specialAction']; reason: string }[] = [
  {
    pattern: /\b(birthday|birth_?date|dob|date_?of_?birth)\b/i,
    action: 'convert_age',
    reason: 'Contains birthdate — can be converted to age (de-identified)',
  },
  {
    pattern: /\b(gps|latitude|longitude|altitude|precision|_gps_)\b/i,
    action: 'keep_barangay_only',
    reason: 'GPS coordinates are precise — consider keeping barangay name only',
  },
  {
    pattern: /\b(case_?id|record_?no|epi_?no)\b/i,
    action: 'hash_id',
    reason: 'Case ID — can be hashed to preserve linkability without direct identification',
  },
]

function normalizeColName(name: string): string {
  return name.toLowerCase().replace(/[\s\-/\\\.]+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function toSnakeCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function classifyColumns(columnNames: string[]): ColumnClassification[] {
  return columnNames.map(name => {
    const normalized = normalizeColName(name)
    const clean = toSnakeCase(name)

    // Check special cases first
    for (const special of SPECIAL_CASES) {
      if (special.pattern.test(normalized)) {
        // Birthday is PHI but with a conversion option
        const isPhi = /\b(birthday|birth_?date|dob|date_?of_?birth)\b/i.test(normalized)
        const isGps = /\b(gps|latitude|longitude|altitude|precision)\b/i.test(normalized)
        return {
          name,
          cleanName: clean,
          classification: isPhi ? 'phi' : isGps ? 'phi' : 'keep',
          reason: special.reason,
          specialAction: special.action,
        }
      }
    }

    // Check PHI patterns
    for (const pattern of PHI_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          name,
          cleanName: clean,
          classification: 'phi',
          reason: 'Likely contains patient identifying information',
        }
      }
    }

    // Check keep patterns
    for (const pattern of KEEP_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          name,
          cleanName: clean,
          classification: 'keep',
          reason: 'Standard epidemiological analysis field',
        }
      }
    }

    // Unknown — flag for review
    return {
      name,
      cleanName: clean,
      classification: 'review',
      reason: 'Could not determine automatically — please review',
    }
  })
}

// WHO Line List standard target column names
export const WHO_LINE_LIST_COLUMNS = [
  'case_id', 'date_onset', 'date_consult', 'date_admit', 'date_discharge',
  'date_report', 'epi_week', 'age', 'sex', 'civil_status', 'barangay',
  'municipality', 'province', 'region', 'case_classification',
  'symptoms', 'comorbidities', 'vaccination_status', 'exposure_history',
  'lab_specimen', 'lab_result', 'outcome', 'date_outcome', 'reporting_dru',
]

// PIDSR-specific additional columns
export const PIDSR_COLUMNS = [
  ...WHO_LINE_LIST_COLUMNS,
  'pidsr_code', 'morbidity_week', 'disease', 'reporting_facility', 'icd_code',
]
