import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

// GET — list all templates for the current user
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('analysis_templates')
    .select('id, name, research_question, hypothesis, selected_test, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, templates: data || [] })
}

// POST — create a new template
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { name, research_question, hypothesis, selected_test } = body

  if (!name?.trim() || !research_question?.trim()) {
    return NextResponse.json({ success: false, error: 'Name and research question are required.' }, { status: 400 })
  }

  // Check for duplicate name for this user
  const { data: existing } = await supabaseAdmin
    .from('analysis_templates')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name.trim())
    .single()

  if (existing) {
    // Update existing instead of creating duplicate
    const { data, error } = await supabaseAdmin
      .from('analysis_templates')
      .update({ research_question: research_question.trim(), hypothesis: hypothesis?.trim() || '', selected_test: selected_test || '', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, template: data, updated: true })
  }

  const { data, error } = await supabaseAdmin
    .from('analysis_templates')
    .insert({ user_id: userId, name: name.trim(), research_question: research_question.trim(), hypothesis: hypothesis?.trim() || '', selected_test: selected_test || '' })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, template: data, updated: false })
}

// DELETE — remove a template by id
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ success: false, error: 'Template ID required.' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('analysis_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId) // safety: can only delete own templates

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
