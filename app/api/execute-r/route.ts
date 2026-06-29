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

    // Get a fresh signed URL from Supabase Storage and inject into R script
    let finalScript = rScript
    if (storagePath) {
      const signedUrl = await getSignedUrl(storagePath)
      if (signedUrl) {
        const ext = storagePath.split('.').pop() || 'xlsx'
        const tempPath = `/tmp/joanresearch_${Date.now()}.${ext}`
        const downloadBlock = `# === DOWNLOAD DATASET FROM SECURE STORAGE ===\ntemp_dataset_path <- "${tempPath}"\ndownload.file("${signedUrl}", temp_dataset_path, mode="wb", quiet=TRUE)\nfile_path <- temp_dataset_path\n`
        // Remove the original file_path line entirely, then prepend download block
        finalScript = downloadBlock + rScript.replace(/^file_path\s*<-\s*["'][^"']*["']\s*\n?/m, '')
        console.log('[Execute-R] Injected download.file() — storagePath:', storagePath)
      } else {
        console.warn('[Execute-R] Could not generate signed URL for:', storagePath)
        return NextResponse.json({ success: false, error: 'Could not access dataset. Please re-upload the file.' }, { status: 400 })
      }
    } else {
      console.warn('[Execute-R] No storagePath — file will not be found on Render')
      return NextResponse.json({ success: false, error: 'Dataset reference missing. Please re-upload the file and try again.' }, { status: 400 })
    }

    if (process.env.R_API_URL) {
      console.log('[Execute-R API] Waking R API...')
      await wakeRApi()
    }

    console.log('[Execute-R API] Running R script...')
    const execution = await executeRScript(finalScript, excelFilePath || '')

    if (!execution.success) {
      console.error('[Execute-R] R failed. Output:', execution.rawOutput?.slice(0, 500))
      console.error('[Execute-R] Error:', execution.errorMessage)
      return NextResponse.json({ success: false, execution, error: String(execution.errorMessage || 'R execution failed.') })
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
