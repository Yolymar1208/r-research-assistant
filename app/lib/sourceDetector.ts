// Client-side only. Detects the source system of a raw data export
// by pattern-matching column names. PHI never leaves the browser.

export type DataSource =
  | 'kobo'      // KoboToolbox / ODK
  | 'gforms'    // Google Forms
  | 'redcap'    // REDCap / Qualtrics
  | 'pidsr'     // Philippine PIDSR export
  | 'heis'      // Hospital EMR / HEIS
  | 'generic'   // Manual Excel or unknown source

export interface SourceDetectionResult {
  source: DataSource
  confidence: 'high' | 'medium' | 'low'
  label: string
  description: string
  metadataColumns: string[]  // columns to auto-remove as system metadata
}

const SIGNATURES: {
  source: DataSource
  label: string
  description: string
  required: string[]       // must have ALL of these (case-insensitive partial match)
  optional: string[]       // bonus signals
  metadata: string[]       // auto-remove these columns
}[] = [
  {
    source: 'kobo',
    label: 'KoboToolbox / ODK',
    description: 'KoboToolbox or ODK Collect export detected',
    required: ['_uuid', '_submission_time'],
    optional: ['_submitted_by', '_validation_status', '_index', '_parent_index', '_tags', '_notes', '_geolocation'],
    metadata: ['_uuid', '_submission_time', '_submitted_by', '_validation_status', '_index', '_parent_index', '_parent_table_name', '_tags', '_notes', '_geolocation', '_id', 'meta/instanceID', 'meta/deprecatedID'],
  },
  {
    source: 'gforms',
    label: 'Google Forms',
    description: 'Google Forms export detected',
    required: ['timestamp'],
    optional: ['email address', 'email_address'],
    metadata: ['timestamp', 'email address', 'email_address'],
  },
  {
    source: 'redcap',
    label: 'REDCap / Qualtrics',
    description: 'REDCap or Qualtrics survey export detected',
    required: ['responseid'],
    optional: ['startdate', 'enddate', 'status', 'ipaddress', 'progress', 'duration', 'finished', 'recordeddate', 'locationlatitude', 'locationlongitude'],
    metadata: ['responseid', 'startdate', 'enddate', 'status', 'ipaddress', 'progress', 'duration', 'finished', 'recordeddate', 'distributionchannel', 'userlanguage', 'locationlatitude', 'locationlongitude'],
  },
  {
    source: 'pidsr',
    label: 'PIDSR Export',
    description: 'Philippine PIDSR (Integrated Disease Surveillance) export detected',
    required: ['morbidity_week'],
    optional: ['pidsr_code', 'dru_name', 'epi_week', 'reporting_unit', 'disease_code', 'icd_code'],
    metadata: ['pidsr_code', 'reporting_unit_code', 'created_at', 'updated_at', 'submitted_by', 'validated_by'],
  },
  {
    source: 'heis',
    label: 'Hospital EMR / HEIS',
    description: 'Hospital Electronic Information System or EMR export detected',
    required: ['patientid'],
    optional: ['admissiondate', 'dischargedate', 'icd_code', 'drg_code', 'ward', 'bed_no', 'attending_physician'],
    metadata: ['patientid', 'mrn', 'encounter_id', 'created_by', 'modified_by', 'created_date', 'modified_date', 'record_status'],
  },
]

function normalizeColName(name: string): string {
  return name.toLowerCase().replace(/[\s\-/\\\.]+/g, '_')
}

export function detectSource(columnNames: string[]): SourceDetectionResult {
  const normalized = columnNames.map(normalizeColName)

  for (const sig of SIGNATURES) {
    const requiredMatches = sig.required.filter(req =>
      normalized.some(col => col.includes(normalizeColName(req)))
    )

    if (requiredMatches.length === sig.required.length) {
      const optionalMatches = sig.optional.filter(opt =>
        normalized.some(col => col.includes(normalizeColName(opt)))
      )
      const confidence = optionalMatches.length >= 2 ? 'high' : optionalMatches.length >= 1 ? 'medium' : 'low'

      // Find the actual column names that match metadata patterns
      const metadataColumns = columnNames.filter(col =>
        sig.metadata.some(meta => normalizeColName(col).includes(normalizeColName(meta)))
      )

      return {
        source: sig.source,
        confidence,
        label: sig.label,
        description: sig.description,
        metadataColumns,
      }
    }
  }

  return {
    source: 'generic',
    confidence: 'high',
    label: 'Generic / Manual Excel',
    description: 'No specific source system detected — treating as manually entered data',
    metadataColumns: [],
  }
}

export const SOURCE_OPTIONS: { value: DataSource; label: string }[] = [
  { value: 'kobo', label: 'KoboToolbox / ODK' },
  { value: 'gforms', label: 'Google Forms' },
  { value: 'redcap', label: 'REDCap / Qualtrics' },
  { value: 'pidsr', label: 'PIDSR Export' },
  { value: 'heis', label: 'Hospital EMR / HEIS' },
  { value: 'generic', label: 'Generic / Manual Excel' },
]
