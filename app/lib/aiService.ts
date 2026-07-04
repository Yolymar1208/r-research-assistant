import Anthropic from '@anthropic-ai/sdk'
import type { DatasetSummary, AnalysisPlan } from '@/app/types'
import {
  buildAnalysisPlannerPrompt,
  buildRCodeGeneratorPrompt,
  buildInterpretationPrompt,
} from '@/app/lib/prompts'

// ─── Model routing ─────────────────────────────────────────────────────────────
// Haiku 4.5  ($1/$5 per MTok)  — test selection + R code generation
// Sonnet 4.6 ($3/$15 per MTok) — interpretation only (what users/DOH read)
// Savings vs all-Sonnet: ~60% per analysis with caching enabled.

const MODEL_PLANNING = 'claude-haiku-4-5-20251001'
const MODEL_INTERPRET = 'claude-sonnet-4-6'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.')
  return new Anthropic({ apiKey })
}

// ─── Step 1: Create Analysis Plan ─────────────────────────────────────────────

export async function createAnalysisPlan(
  summary: DatasetSummary,
  researchQuestion: string,
  hypothesis: string
): Promise<AnalysisPlan> {
  const client = getClient()
  const fullPrompt = buildAnalysisPlannerPrompt(summary, researchQuestion, hypothesis)

  // Cache everything before the per-user dataset profile (static instruction block)
  const splitMarker = 'DATASET PROFILE:'
  const splitIdx = fullPrompt.indexOf(splitMarker)

  let messages: Anthropic.MessageParam[]
  if (splitIdx !== -1) {
    messages = [{
      role: 'user',
      content: [
        { type: 'text', text: fullPrompt.slice(0, splitIdx).trimEnd(), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: '\n\n' + fullPrompt.slice(splitIdx) },
      ],
    }]
  } else {
    messages = [{ role: 'user', content: fullPrompt }]
  }

  const response = await client.messages.create({
    model: MODEL_PLANNING,
    max_tokens: 1024,
    messages,
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('').trim()

  let cleaned = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/m, '').trim()
  const jsonStart = cleaned.indexOf('{')
  const jsonEnd = cleaned.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) cleaned = cleaned.slice(jsonStart, jsonEnd + 1)

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    delete parsed.planRCode; delete parsed.rCode; delete parsed.code
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
  const fullPrompt = buildRCodeGeneratorPrompt(plan, summary, excelFilePath)

  // Cache everything before the per-user file path + column list
  const splitMarker = 'FILE PATH:'
  const splitIdx = fullPrompt.indexOf(splitMarker)

  let messages: Anthropic.MessageParam[]
  if (splitIdx !== -1) {
    messages = [{
      role: 'user',
      content: [
        { type: 'text', text: fullPrompt.slice(0, splitIdx).trimEnd(), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: '\n\n' + fullPrompt.slice(splitIdx) },
      ],
    }]
  } else {
    messages = [{ role: 'user', content: fullPrompt }]
  }

  const response = await client.messages.create({
    model: MODEL_PLANNING,
    max_tokens: 4096,
    messages,
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('').trim()

  return text.replace(/^```r?\n?/im, '').replace(/\n?```$/m, '').trim()
}

// ─── Step 3: Interpret R Output ────────────────────────────────────────────────

export async function interpretROutput(
  plan: AnalysisPlan,
  rScript: string,
  rawOutput: string,
  language: 'english' | 'filipino' = 'english'
): Promise<string> {
  const client = getClient()
  const fullPrompt = buildInterpretationPrompt(plan, rScript, rawOutput, language)

  // Cache everything before the per-request plan + R output
  const splitMarker = 'RESEARCH QUESTION:'
  const splitIdx = fullPrompt.indexOf(splitMarker)

  let messages: Anthropic.MessageParam[]
  if (splitIdx !== -1) {
    messages = [{
      role: 'user',
      content: [
        { type: 'text', text: fullPrompt.slice(0, splitIdx).trimEnd(), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: '\n\n' + fullPrompt.slice(splitIdx) },
      ],
    }]
  } else {
    messages = [{ role: 'user', content: fullPrompt }]
  }

  const response = await client.messages.create({
    model: MODEL_INTERPRET,
    max_tokens: 2048,
    messages,
  })

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('').trim()
}
