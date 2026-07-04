import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'yolymarorfiano@yahoo.com'

const PLAN_CONFIG: Record<string, { limit: number; maxMembers: number; label: string }> = {
  free:        { limit: 3,      maxMembers: 1,  label: 'Free' },
  researcher:  { limit: 999999, maxMembers: 1,  label: 'Researcher (₱1,499/mo)' },
  team:        { limit: 999999, maxMembers: 5,  label: 'Team (₱3,499/mo)' },
  institution: { limit: 999999, maxMembers: 20, label: 'Institution (₱8,999/mo)' },
}

async function getAdminEmail(request: NextRequest): Promise<string | null> {
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
    return user?.email ?? null
  } catch { return null }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const adminEmail = await getAdminEmail(request)
    if (adminEmail !== ADMIN_EMAIL) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, plan } = await request.json()

    if (!userId || !plan) {
      return NextResponse.json({ success: false, error: 'userId and plan are required.' }, { status: 400 })
    }

    const config = PLAN_CONFIG[plan]
    if (!config) {
      return NextResponse.json({
        success: false,
        error: `Invalid plan "${plan}". Valid plans: ${Object.keys(PLAN_CONFIG).join(', ')}`
      }, { status: 400 })
    }

    // Update users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({ plan, analyses_limit: config.limit, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (userError) {
      return NextResponse.json({ success: false, error: userError.message }, { status: 500 })
    }

    // Update usage_tracking plan label
    await supabaseAdmin
      .from('usage_tracking')
      .update({ plan })
      .eq('user_id', userId)

    // If team or institution plan, update their existing team's max_members if they have one
    if (['team', 'institution'].includes(plan)) {
      await supabaseAdmin
        .from('teams')
        .update({ plan, max_members: config.maxMembers })
        .eq('owner_id', userId)
    }

    return NextResponse.json({ success: true, plan, label: config.label })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upgrade failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
