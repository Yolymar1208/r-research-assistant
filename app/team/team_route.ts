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

// GET — get current user's team info
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  // Check if user owns a team
  const { data: ownedTeam } = await supabaseAdmin
    .from('teams')
    .select('*, team_members(id, user_id, role, status, joined_at, invited_email, users:user_id(email, plan))')
    .eq('owner_id', userId)
    .single()

  if (ownedTeam) {
    return NextResponse.json({ success: true, team: ownedTeam, role: 'owner' })
  }

  // Check if user is a member
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('*, teams(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (membership) {
    return NextResponse.json({ success: true, team: membership.teams, role: 'member' })
  }

  return NextResponse.json({ success: true, team: null })
}

// POST — create team or add member
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action } = body

  // Create a new team
  if (action === 'create') {
    const { name } = body
    if (!name?.trim()) return NextResponse.json({ success: false, error: 'Team name is required.' }, { status: 400 })

    // Check user has team or institution plan
    const { data: user } = await supabaseAdmin.from('users').select('plan').eq('id', userId).single()
    if (!user || !['team', 'institution'].includes(user.plan)) {
      return NextResponse.json({ success: false, error: 'Team plan required to create a team.' }, { status: 403 })
    }

    // Create team
    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .insert({ name: name.trim(), owner_id: userId, plan: user.plan, max_members: user.plan === 'institution' ? 20 : 5 })
      .select().single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    // Add owner as a member
    await supabaseAdmin.from('team_members').insert({ team_id: team.id, user_id: userId, role: 'owner', status: 'active' })

    return NextResponse.json({ success: true, team })
  }

  // Add a member by email
  if (action === 'add_member') {
    const { teamId, email } = body
    if (!email?.trim()) return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 })

    // Verify requester is the team owner
    const { data: team } = await supabaseAdmin.from('teams').select('id, max_members').eq('id', teamId).eq('owner_id', userId).single()
    if (!team) return NextResponse.json({ success: false, error: 'Team not found or access denied.' }, { status: 403 })

    // Check member count
    const { count } = await supabaseAdmin.from('team_members').select('*', { count: 'exact' }).eq('team_id', teamId).eq('status', 'active')
    if ((count ?? 0) >= team.max_members) {
      return NextResponse.json({ success: false, error: `Team is full (max ${team.max_members} members).` }, { status: 400 })
    }

    // Find user by email
    const { data: targetUser } = await supabaseAdmin.from('users').select('id').eq('email', email.trim()).single()
    if (!targetUser) {
      // Store as pending invite by email
      const { error } = await supabaseAdmin.from('team_members').insert({ team_id: teamId, user_id: userId, role: 'member', invited_email: email.trim(), status: 'pending' })
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, status: 'pending', message: 'Invite recorded — they must sign up with this email to join.' })
    }

    // Add existing user directly
    const { error } = await supabaseAdmin.from('team_members').upsert({ team_id: teamId, user_id: targetUser.id, role: 'member', invited_email: email.trim(), status: 'active' })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, status: 'added' })
  }

  return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 })
}

// DELETE — remove a team member
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { memberId, teamId } = await request.json()

  // Verify requester is team owner
  const { data: team } = await supabaseAdmin.from('teams').select('id').eq('id', teamId).eq('owner_id', userId).single()
  if (!team) return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 })

  const { error } = await supabaseAdmin.from('team_members').delete().eq('id', memberId).eq('team_id', teamId)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
