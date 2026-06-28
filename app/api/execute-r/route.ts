import { NextRequest, NextResponse } from 'next/server'
import { executeRScript, wakeRApi } from '@/app/lib/rExecutor'
import { interpretROutput } from '@/app/lib/aiService'
import { incrementUsage, saveAnalysisHistory } from '@/app/lib/usageTracker'
import { getSignedUrl } from '@/app/lib/fileStorage'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
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
    const { rScript, plan, excelFilePath, datasetName, storagePath } = body

    if (!rScript?.trim()) {
      return NextResponse.json({ success: false, error: 'R script is required.' }, { status: 400 })
    }

    // Build final script — replace file path with download from Supabase Storage
    let finalScript = rScript
    if (storagePath) {
      const signedUrl = await getSignedUrl(storagePath)
      if (signedUrl) {
        const ext = (excelFilePath || 'file.xlsx').split('.').pop() || 'xlsx'
        const tempPath = `/tmp/dataset_${Date.now()}.${ext}`
        // Prepend download code before the rest of the script
        const downloadCode = [
          '# Download dataset from Supabase Storage',
          `temp_file <- "${tempPath}"`,
          `download.file("${signedUrl}", temp_file, mode="wb", quiet=TRUE)`,
          `file_path <- temp_file`,
          '',
        ].join('\n')
        // Remove the original file_path line and prepend download code
        finalScript = downloadCode + rScript.replace(/^file_path\s*<-\s*["'][^"']+["']\s*$/m, '')
        console.log('[Execute-R] Injected download.file() for Supabase Storage')
      } else {
        console.warn('[Execute-R] Could not get signed URL for storagePath:', storagePath)
      }
    } else {
      console.warn('[Execute-R] No storagePath provided — file may be missing on Render')
    }

    if (process.env.R_API_URL) {
      console.log('[Execute-R API] Waking R API...')
      await wakeRApi()
    }

    console.log('[Execute-R API] Running R script...')
    const execution = await executeRScript(finalScript, excelFilePath || '')

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
