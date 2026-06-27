import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'antetokounmpo8@gmail.com'

async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll() }, setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) { cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user?.email === ADMIN_EMAIL
  } catch { return false }
}

export async function GET(request: NextRequest) {
  if (!await isAdmin(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { data: users, error } = await supabaseAdmin.from('users').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, users })
}
