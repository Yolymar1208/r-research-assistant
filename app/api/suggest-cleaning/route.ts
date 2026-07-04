import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { AISuggestion } from '@/app/lib/lineListCleaner'
import type { DataSource } from '@/app/lib/sourceDetector'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PRIVACY NOTE: This route receives ONLY column names and value distributions.
// Row-level data never leaves the browser. This is enforced by the client-side
// architecture of the Line List Builder (ADR-0004).

interface ColumnProfile {
  name: string
  type: string
  uniqueValues: string[]   // top unique values only, max 10
  sampleCount: number
  missingCount: number
}

interface SuggestCleaningRequest {
  source: DataSource
  rowCount: number
  columnProfiles: ColumnProfile[]
}

const CLIENT = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Static instruction block — cached across requests (Haiku 4.5)
const SYSTEM_INSTRUCTION = `You are an expert Philippine field epidemiologist and data analyst.
You help clean raw case investigation data before statistical analysis.

You will receive ONLY column names and value distributions — never actual patient records.

Your job is to propose cleaning steps in JSON. You must return ONLY a JSON array of suggestions.
No markdown, no backticks, no explanation — raw JSON array only.

Each suggestion has this shape:
{
  "type": "standardize_values" | "rename_column" | "fix_dates" | "merge_multichoice",
  "column": "original column name",
  "newName": "target name (for rename_column only)",
  "description": "one sentence",
  "detail": "specific values affected, shown to user",
  "payload": { ... type-specific data ... }
}

Payload by type:
- standardize_values: { "column": "...", "type": "sex"|"outcome"|"case_classification"|"generic", "recode": {"old": "new", ...} }
- rename_column: { "from": "...", "to": "..." }  (use WHO line list standard names)
- fix_dates: { "column": "...", "formats_found": ["MM/DD/YYYY", "YYYY-MM-DD"] }
- merge_multichoice: { "columns": ["col1", "col2", ...], "targetColumn": "symptoms", "labels": {"col1": "Fever", ...} }

WHO line list standard column names to target:
case_id, date_onset, date_consult, date_admit, date_discharge, date_report,
epi_week, age, sex, civil_status, barangay, municipality, province, region,
case_classification, symptoms, comorbidities, vaccination_status,
exposure_history, lab_specimen, lab_result, outcome, date_outcome, reporting_dru

Rules:
- Only suggest steps that are clearly warranted by the value distributions
- For sex: suggest standardization if values include m/male/M/MALE/lalaki etc.
- For dates: suggest fix_dates if mixed formats detected
- For KoboToolbox multi-choice (cols named symptom_fever, symptom_cough etc.): suggest merge_multichoice
- For long column names (KoboToolbox/Google Forms style): suggest rename_column to WHO standard
- Do NOT suggest removing PHI columns — that is handled separately by the UI
- Maximum 8 suggestions to avoid overwhelming the user`

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SuggestCleaningRequest = await request.json()
    const { source, rowCount, columnProfiles } = body

    if (!columnProfiles?.length) {
      return NextResponse.json({ success: false, error: 'No column profiles provided.' }, { status: 400 })
    }

    // Build the dynamic per-request portion (column profiles only — no row data)
    const dynamicPrompt = `SOURCE: ${source}
ROW COUNT: ${rowCount}

COLUMN PROFILES (name, type, top unique values, missing count):
${columnProfiles.map(col =>
  `- "${col.name}" [${col.type}] unique values: ${col.uniqueValues.slice(0, 8).map(v => `"${v}"`).join(', ')}${col.uniqueValues.length > 8 ? '...' : ''} | missing: ${col.missingCount}/${col.sampleCount}`
).join('\n')}

Propose cleaning steps as a JSON array. Raw JSON only — no markdown.`

    const response = await CLIENT.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku — column metadata is tiny, Haiku handles this well
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          // Cache the static instruction block — identical across all requests
          { type: 'text', text: SYSTEM_INSTRUCTION, cache_control: { type: 'ephemeral' } } as any,
          { type: 'text', text: '\n\n' + dynamicPrompt },
        ],
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    let suggestions: AISuggestion[] = []
    try {
      const parsed = JSON.parse(text)
      suggestions = Array.isArray(parsed) ? parsed : []
    } catch {
      console.error('[suggest-cleaning] AI returned invalid JSON:', text.slice(0, 200))
      suggestions = []
    }

    return NextResponse.json({ success: true, suggestions })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Suggestion failed.'
    console.error('[suggest-cleaning]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
