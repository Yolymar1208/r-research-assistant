import { NextRequest, NextResponse } from 'next/server'
import { executeRScript, wakeRApi } from '@/app/lib/rExecutor'
import { interpretROutput } from '@/app/lib/aiService'
import type { AnalysisPlan, RExecutionResult } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ExecuteRequest {
  rScript: string
  plan: AnalysisPlan
  excelFilePath?: string
}

interface ExecuteResponse {
  success: boolean
  execution?: RExecutionResult
  interpretation?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ExecuteResponse>> {
  try {
    const body: ExecuteRequest = await request.json()
    const { rScript, plan, excelFilePath } = body

    if (!rScript?.trim()) {
      return NextResponse.json({ success: false, error: 'R script is required.' }, { status: 400 })
    }

    // Wake the R API if running in production (Render free tier sleeps)
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

    return NextResponse.json({ success: true, execution, interpretation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Execution failed.'
    console.error('[Execute-R API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
