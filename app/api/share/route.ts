import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { AnalysisResult } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 32-character URL-safe random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => chars[b % chars.length]).join('')
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

interface ShareRequest {
  result: AnalysisResult
  datasetName: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'You must be logged in to share an analysis.' }, { status: 401 })
    }

    const body: ShareRequest = await request.json()
    const { result, datasetName } = body

    if (!result?.plan || !result?.execution) {
      return NextResponse.json({ success: false, error: 'Invalid analysis result.' }, { status: 400 })
    }

    const token = generateToken()

    const { error } = await supabaseAdmin
      .from('shared_analyses')
      .insert({
        token,
        user_id: userId,
        dataset_name: datasetName,
        research_question: result.plan.researchQuestion,
        selected_test: result.plan.selectedTest,
        ai_interpretation: result.aiInterpretation,
        r_script: result.rScript,
        raw_output: result.execution.rawOutput,
        execution_success: result.execution.success,
        execution_time_ms: result.execution.executionTimeMs,
        plan: result.plan as unknown as Record<string, unknown>,
      })

    if (error) {
      console.error('[Share API]', error)
      return NextResponse.json({ success: false, error: 'Failed to create share link.' }, { status: 500 })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://r-research-assistant-vx33.vercel.app'}/share/${token}`
    return NextResponse.json({ success: true, token, shareUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Share failed.'
    console.error('[Share API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
