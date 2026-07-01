import { NextRequest, NextResponse } from 'next/server'
import { interpretROutput } from '@/app/lib/aiService'
import type { AnalysisPlan } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ReinterpretRequest {
  plan: AnalysisPlan
  rScript: string
  rawOutput: string
  language: 'english' | 'filipino'
}

export async function POST(request: NextRequest) {
  try {
    const body: ReinterpretRequest = await request.json()
    const { plan, rScript, rawOutput, language } = body

    if (!plan || !rawOutput || !language) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 })
    }

    if (!['english', 'filipino'].includes(language)) {
      return NextResponse.json({ success: false, error: 'Invalid language. Must be english or filipino.' }, { status: 400 })
    }

    const interpretation = await interpretROutput(plan, rScript, rawOutput, language)

    return NextResponse.json({ success: true, interpretation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reinterpretation failed.'
    console.error('[Reinterpret API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
