import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'yolymarorfiano@yahoo.com'

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminEmail = await getAdminEmail(request)
  if (adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Get all users from auth.users (service role — bypasses RLS)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    })
    if (authError) throw authError

    const authUsers = authData?.users || []

    // 2. Get all rows from public.users for plan info
    const { data: publicUsers } = await supabaseAdmin
      .from('users')
      .select('id, plan, analyses_limit')

    const planMap = Object.fromEntries(
      (publicUsers || []).map(u => [u.id, { plan: u.plan, analyses_limit: u.analyses_limit }])
    )

    // 3. Get current month analysis count from analysis_history (tracks ALL plans)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { data: history } = await supabaseAdmin
      .from('analysis_history')
      .select('user_id')
      .gte('created_at', monthStart)

    const usageMap: Record<string, number> = {}
    for (const row of history || []) {
      if (row.user_id) usageMap[row.user_id] = (usageMap[row.user_id] || 0) + 1
    }

    // 4. Ensure every auth user has a row in public.users
    for (const authUser of authUsers) {
      if (!planMap[authUser.id]) {
        // Insert missing user — ignoreDuplicates prevents overwriting existing plan
        await supabaseAdmin
          .from('users')
          .upsert({
            id: authUser.id,
            email: authUser.email || '',
            plan: 'free',
            analyses_limit: 3,
            created_at: authUser.created_at,
          }, { onConflict: 'id', ignoreDuplicates: true })
        planMap[authUser.id] = { plan: 'free', analyses_limit: 3 }
      }
    }

    // 5. Build combined user list
    const users = authUsers.map(u => ({
      id: u.id,
      email: u.email || '',
      plan: planMap[u.id]?.plan || 'free',
      analyses_limit: planMap[u.id]?.analyses_limit || 3,
      created_at: u.created_at,
      current_month_count: usageMap[u.id] || 0,
    }))

    return NextResponse.json({ success: true, users })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load users.'
    console.error('[admin/users]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
