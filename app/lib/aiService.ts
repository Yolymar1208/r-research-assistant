import Anthropic from '@anthropic-ai/sdk'
import type { DatasetSummary, AnalysisPlan } from '@/app/types'
import {
  buildAnalysisPlannerPrompt,
  buildRCodeGeneratorPrompt,
  buildInterpretationPrompt,
} from '@/app/lib/prompts'

const MODEL = 'claude-sonnet-4-6'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Please add it to your .env.local file.')
  }
  return new Anthropic({ apiKey })
}

// ─── Step 1: Create Analysis Plan ─────────────────────────────────────────────

export async function createAnalysisPlan(
  summary: DatasetSummary,
  researchQuestion: string,
  hypothesis: string
): Promise<AnalysisPlan> {
  const client = getClient()
  const prompt = buildAnalysisPlannerPrompt(summary, researchQuestion, hypothesis)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()

  let cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  const jsonStart = cleaned.indexOf('{')
  const jsonEnd = cleaned.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1)
  }

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    delete parsed.planRCode
    delete parsed.rCode
    delete parsed.code
    return parsed as unknown as AnalysisPlan
  } catch {
    throw new Error(`AI returned invalid JSON for analysis plan.\n\nRaw response:\n${text}`)
  }
}

// ─── Step 2: Generate R Script ─────────────────────────────────────────────────

export async function generateRScript(
  plan: AnalysisPlan,
  summary: DatasetSummary,
  excelFilePath: string
): Promise<string> {
  const client = getClient()
  const prompt = buildRCodeGeneratorPrompt(plan, summary, excelFilePath)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()

  return text
    .replace(/^```r?\n?/im, '')
    .replace(/\n?```$/m, '')
    .trim()
}

// ─── Step 3: Interpret R Output ────────────────────────────────────────────────
// language: 'english' (default) | 'filipino'
// All statistical values come from rawOutput regardless of language —
// only the surrounding explanation text changes.

export async function interpretROutput(
  plan: AnalysisPlan,
  rScript: string,
  rawOutput: string,
  language: 'english' | 'filipino' = 'english'
): Promise<string> {
  const client = getClient()
  const prompt = buildInterpretationPrompt(plan, rScript, rawOutput, language)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
}
