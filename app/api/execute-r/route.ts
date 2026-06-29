import { NextRequest, NextResponse } from 'next/server'
import { executeRScript, wakeRApi } from '@/app/lib/rExecutor'
import { interpretROutput } from '@/app/lib/aiService'
import { incrementUsage, saveAnalysisHistory } from '@/app/lib/usageTracker'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { AnalysisPlan, RExecutionResult } from '@/app/types'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP.trim()
  return '127.0.0.1'
}

async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch { return null }
}

interface ExecuteRequest {
  rScript: string
  plan: AnalysisPlan
  excelFilePath?: string
  datasetName?: string
  storagePath?: string
  fileBase64?: string
  fileExt?: string
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
    const userId = await getUserId(request)
    const body: ExecuteRequest = await request.json()
    const { rScript, plan, excelFilePath, datasetName, fileBase64, fileExt } = body

    if (!rScript?.trim()) {
      return NextResponse.json({ success: false, error: 'R script is required.' }, { status: 400 })
    }

    // Restore file from base64 if temp file is missing
    let finalFilePath = excelFilePath || ''
    if (fileBase64 && (!finalFilePath || !fs.existsSync(finalFilePath))) {
      try {
        const tempDir = path.join(os.tmpdir(), 'r-research-assistant')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
        const ext = fileExt || 'xlsx'
        finalFilePath = path.join(tempDir, `restored_${Date.now()}.${ext}`)
        fs.writeFileSync(finalFilePath, Buffer.from(fileBase64, 'base64'))
        console.log('[Execute-R] File restored from base64:', finalFilePath)
      } catch (err) {
        console.warn('[Execute-R] Could not restore from base64:', err)
      }
    }

    if (process.env.R_API_URL) {
      console.log('[Execute-R API] Waking R API...')
      await wakeRApi()
    }

    console.log('[Execute-R API] Running R script...')
    const execution = await executeRScript(rScript, finalFilePath)

    if (!execution.success) {
      return NextResponse.json({ success: false, execution, error: execution.errorMessage || 'R execution failed.' })
    }

    console.log('[Execute-R API] Interpreting R output...')
    const interpretation = await interpretROutput(plan, rScript, execution.rawOutput)

    incrementUsage(userId, ip).catch(console.error)

    saveAnalysisHistory(userId, ip, {
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
