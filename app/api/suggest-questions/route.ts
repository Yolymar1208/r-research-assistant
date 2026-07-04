import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { DatasetSummary } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLIENT = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Static instruction — cached across all requests
const SYSTEM_INSTRUCTION = `You are a senior Philippine field epidemiologist and biostatistician.
Given a dataset profile (column names, types, value distributions), suggest research questions
that are appropriate for the data and useful for Philippine public health reporting.

Return ONLY a raw JSON array of 4-5 research question strings. No markdown, no backticks, no explanation.

Rules:
- Each question should be answerable with the available columns
- Prioritize epidemiologically meaningful questions (outbreak investigation, risk factors, outcomes)
- Use plain language — as if asking a biostatistician, not naming a specific test
- Include at least one question about time (if date columns exist), one about demographics, one about outcomes
- For epi data: suggest epidemic curve, attack rate, age-sex distribution where appropriate
- Keep each question under 20 words
- Questions must be specific to the actual columns present — never invent columns

Example output:
["What is the epidemic curve of cases by date of symptom onset?",
 "Is there a significant difference in outcome between vaccinated and unvaccinated cases?",
 "What is the age and sex distribution of cases?",
 "What is the attack rate among exposed versus unexposed individuals?",
 "Is there an association between exposure history and case classification?"]`

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const summary: DatasetSummary = body.summary

    if (!summary?.columns?.length) {
      return NextResponse.json({ success: false, error: 'No dataset summary provided.' }, { status: 400 })
    }

    // Build compact column profile — only names, types, and key value info
    // This is the only data sent to AI — no actual row values
    const columnProfile = summary.columns.map(col => {
      const parts = [`"${col.name}" [${col.detectedType}]`]
      if (col.uniqueCount <= 10) parts.push(`values: ${col.sample.filter(Boolean).slice(0, 5).join(', ')}`)
      if (col.missingPercent > 20) parts.push(`${col.missingPercent}% missing`)
      return parts.join(' — ')
    }).join('\n')

    const dynamicPrompt = `DATASET: ${summary.fileName}
ROWS: ${summary.rowCount}
COLUMNS (${summary.columnCount}):
${columnProfile}

Suggest 4-5 research questions for this dataset. Raw JSON array only.`

    const response = await CLIENT.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_INSTRUCTION, cache_control: { type: 'ephemeral' } } as any,
          { type: 'text', text: '\n\n' + dynamicPrompt },
        ],
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('').trim()
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    let questions: string[] = []
    try {
      const parsed = JSON.parse(text)
      questions = Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === 'string') : []
    } catch {
      console.error('[suggest-questions] Invalid JSON:', text.slice(0, 200))
      return NextResponse.json({ success: false, error: 'Could not parse suggestions.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, questions })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Suggestion failed.'
    console.error('[suggest-questions]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
