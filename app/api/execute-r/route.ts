import { NextRequest, NextResponse } from 'next/server'
import { executeRScript, wakeRApi } from '@/app/lib/rExecutor'
import { interpretROutput } from '@/app/lib/aiService'
import { incrementUsage, saveAnalysisHistory } from '@/app/lib/usageTracker'
import type { AnalysisPlan, RExecutionResult } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP.trim()
  return '127.0.0.1'
}

interface ExecuteRequest {
  rScript: string
  plan: AnalysisPlan
  excelFilePath?: string
  datasetName?: string
}

interface ExecuteResponse {
  success: boolean
  execution?: RExecutionResult
  interpretation?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ExecuteResponse>> {
  try {
    const ip = getClientIP(request)
    const body: ExecuteRequest = await request.json()
    const { rScript, plan, excelFilePath, datasetName } = body

    if (!rScript?.trim()) {
      return NextResponse.json({ success: false, error: 'R script is required.' }, { status: 400 })
    }

    // Wake R API if in production
    if (process.env.R_API_URL) {
      console.log('[Execute-R API] Waking R API...')
      await wakeRApi()
    }

    // Execute R
    console.log('[Execute-R API] Running R script...')
    const execution = await executeRScript(rScript, excelFilePath || '')

    if (!execution.success) {
      return NextResponse.json({ success: false, execution, error: execution.errorMessage || 'R execution failed.' })
    }

    // AI interprets the output
    console.log('[Execute-R API] Interpreting R output...')
    const interpretation = await interpretROutput(plan, rScript, execution.rawOutput)

    // Increment usage count (fire and forget)
    incrementUsage(ip).catch(console.error)

    // Save to history (fire and forget)
    saveAnalysisHistory(ip, {
      datasetName: datasetName || 'Unknown',
      researchQuestion: plan.researchQuestion,
      selectedTest: plan.selectedTest,
      aiInterpretation: interpretation,
      rScript,
      rawOutput: execution.rawOutput,
      executionSuccess: execution.success,
    }).catch(console.error)

    return NextResponse.json({ success: true, execution, interpretation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Execution failed.'
    console.error('[Execute-R API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
