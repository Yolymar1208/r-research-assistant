import { NextRequest, NextResponse } from 'next/server'
import { createAnalysisPlan, generateRScript } from '@/app/lib/aiService'
import type { AnalyzeRequest, AnalyzeResponse } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const body: AnalyzeRequest = await request.json()
    const { datasetSummary, researchQuestion, hypothesis } = body

    if (!datasetSummary) {
      return NextResponse.json(
        { success: false, error: 'Dataset summary is required.' },
        { status: 400 }
      )
    }

    if (!researchQuestion?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Research question is required.' },
        { status: 400 }
      )
    }

    // Step 1: AI creates analysis plan
    console.log('[Analyze API] Creating analysis plan...')
    const plan = await createAnalysisPlan(datasetSummary, researchQuestion, hypothesis || '')

    // Step 2: AI generates R script
    console.log('[Analyze API] Generating R script...')
    const rScript = await generateRScript(plan, datasetSummary, datasetSummary.tempFilePath)

    return NextResponse.json({ success: true, plan, rScript })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis planning failed.'
    console.error('[Analyze API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
