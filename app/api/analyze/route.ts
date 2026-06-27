import { NextRequest, NextResponse } from 'next/server'
import { createAnalysisPlan, generateRScript } from '@/app/lib/aiService'
import { checkUsageLimit } from '@/app/lib/usageTracker'
import type { AnalyzeRequest, AnalyzeResponse } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP.trim()
  return '127.0.0.1'
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const ip = getClientIP(request)

    // Check usage limit
    const usage = await checkUsageLimit(ip)
    if (!usage.allowed) {
      return NextResponse.json({
        success: false,
        error: `FREE_LIMIT_REACHED:${usage.currentCount}:${usage.limit}`,
      }, { status: 429 })
    }

    const body: AnalyzeRequest = await request.json()
    const { datasetSummary, researchQuestion, hypothesis } = body

    if (!datasetSummary) {
      return NextResponse.json({ success: false, error: 'Dataset summary is required.' }, { status: 400 })
    }
    if (!researchQuestion?.trim()) {
      return NextResponse.json({ success: false, error: 'Research question is required.' }, { status: 400 })
    }

    console.log('[Analyze API] Creating analysis plan...')
    const plan = await createAnalysisPlan(datasetSummary, researchQuestion, hypothesis || '')

    console.log('[Analyze API] Generating R script...')
    const rScript = await generateRScript(plan, datasetSummary, datasetSummary.tempFilePath)

    return NextResponse.json({ success: true, plan, rScript })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis planning failed.'
    console.error('[Analyze API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
