'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'
import Starfield from '@/app/components/Starfield'

const supabase = createClient()

interface TeamMember {
  id: string
  user_id: string
  role: string
  status: string
  joined_at: string
  invited_email: string | null
  users?: { email: string; plan: string } | null
}

interface Team {
  id: string
  name: string
  owner_id: string
  plan: string
  max_members: number
  created_at: string
  team_members?: TeamMember[]
}

const glass: React.CSSProperties = {
  background: 'rgba(18,26,48,0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(124,92,255,0.2)',
  borderRadius: '14px',
}

export default function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [role, setRole] = useState<'owner' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userPlan, setUserPlan] = useState('')

  // Create team form
  const [teamName, setTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Add member form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState('')
  const [inviteError, setInviteError] = useState('')

  // Remove member
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || '')

      // Get user plan from public.users
      if (user) {
        const { data: u } = await supabase
          .from('users')
          .select('plan')
          .eq('id', user.id)
          .single()
        setUserPlan(u?.plan || 'free')
      }

      await loadTeam()
    }
    init()
  }, [])

  async function loadTeam() {
    setLoading(true)
    try {
      const res = await fetch('/api/team')
      if (!res.ok) {
        console.error('[team page] API error:', res.status)
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.success) {
        setTeam(data.team)
        setRole(data.role || null)
      }
    } catch (err) {
      console.error('[team page] loadTeam error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createTeam() {
    if (!teamName.trim()) return
    setCreating(true)
    setCreateError('')
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: teamName.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      setTeamName('')
      await loadTeam()
    } else {
      setCreateError(data.error || 'Failed to create team.')
    }
    setCreating(false)
  }

  async function addMember() {
    if (!inviteEmail.trim() || !team) return
    setInviting(true)
    setInviteError('')
    setInviteResult('')
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_member', teamId: team.id, email: inviteEmail.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      setInviteEmail('')
      setInviteResult(data.status === 'added' ? `✓ ${inviteEmail} added to team` : `↗ Invite recorded — they need to sign up with this email`)
      await loadTeam()
    } else {
      setInviteError(data.error || 'Failed to add member.')
    }
    setInviting(false)
  }

  async function removeMember(memberId: string) {
    if (!team) return
    setRemovingId(memberId)
    await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, teamId: team.id }),
    })
    await loadTeam()
    setRemovingId(null)
  }

  const canCreateTeam = ['team', 'institution'].includes(userPlan)
  const memberCount = team?.team_members?.filter(m => m.status === 'active').length ?? 0

  return (
    <main style={{ minHeight: '100vh', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Starfield />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, background: 'rgba(13,20,40,0.7)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(124,92,255,0.18)', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>J</span>
            </div>
            <span style={{ color: '#f1f4fc', fontWeight: 700, fontSize: '15px' }}>JOANResearchOS</span>
            <span style={{ color: '#6b7aa3', fontSize: '12px', marginLeft: '4px' }}>· Team</span>
          </div>
          <a href="/" style={{ fontSize: '13px', color: '#8fb4ff', textDecoration: 'none', border: '1px solid rgba(124,92,255,0.3)', padding: '6px 14px', borderRadius: '8px', background: 'rgba(124,92,255,0.08)' }}>← Back to app</a>
        </div>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 1.5rem', position: 'relative', zIndex: 10 }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8b9bc4' }}>Loading team…</div>
        ) : !team && !canCreateTeam ? (
          /* No team, no team plan */
          <div style={{ ...glass, padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👥</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f4fc', marginBottom: '12px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>
              Team plan required
            </h2>
            <p style={{ color: '#8b9bc4', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px' }}>
              The Team plan lets up to 5 epidemiologists share unlimited analyses, templates, and history. Upgrade to create or join a team.
            </p>
            <a href="/landing#pricing" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', boxShadow: '0 4px 16px rgba(124,92,255,0.35)' }}>
              View Team plan — ₱3,499/mo →
            </a>
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#5a6890' }}>Already have a team plan? Contact <a href="mailto:yolymarorfiano@yahoo.com" style={{ color: '#8fb4ff' }}>yolymarorfiano@yahoo.com</a> to get it activated.</p>
          </div>
        ) : !team && canCreateTeam ? (
          /* Has team plan, no team yet — create one */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ ...glass, padding: '28px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f1f4fc', marginBottom: '8px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>
                Create your team
              </h2>
              <p style={{ color: '#8b9bc4', fontSize: '13px', marginBottom: '20px' }}>
                You have a {userPlan} plan — create your team workspace and invite up to {userPlan === 'institution' ? 20 : 5} members.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="Team name (e.g. NCR RESU Epi Team)"
                  onKeyDown={e => { if (e.key === 'Enter') createTeam() }}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#e8ecf5', fontSize: '14px', outline: 'none' }}
                />
                <button
                  onClick={createTeam}
                  disabled={creating || !teamName.trim()}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: creating || !teamName.trim() ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', color: '#fff', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', opacity: creating || !teamName.trim() ? 0.6 : 1 }}
                >
                  {creating ? '…' : 'Create'}
                </button>
              </div>
              {createError && <p style={{ marginTop: '10px', fontSize: '12px', color: '#fca5a5' }}>{createError}</p>}
            </div>
          </div>
        ) : team ? (
          /* Team exists — show management UI */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Team header */}
            <div style={{ ...glass, padding: '24px 28px', background: 'rgba(124,92,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f4fc', margin: '0 0 4px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>{team.name}</h1>
                  <p style={{ color: '#8b9bc4', fontSize: '13px', margin: 0 }}>
                    {memberCount} of {team.max_members} members · {team.plan} plan · {role === 'owner' ? 'You are the admin' : 'You are a member'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {Array.from({ length: team.max_members }).map((_, i) => (
                    <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: i < memberCount ? '#7c5cff' : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Members list */}
            <div style={glass}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f4fc', margin: 0 }}>Team Members</h2>
              </div>
              <div style={{ padding: '8px 0' }}>
                {(team.team_members || []).map(member => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: member.role === 'owner' ? 'linear-gradient(135deg, #7c5cff, #2e75b6)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(member.users?.email || member.invited_email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: '14px', color: '#e8ecf5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.users?.email || member.invited_email || 'Unknown'}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '8px', background: member.role === 'owner' ? 'rgba(124,92,255,0.2)' : 'rgba(255,255,255,0.06)', color: member.role === 'owner' ? '#c4b5fd' : '#6b7aa3' }}>
                            {member.role}
                          </span>
                          {member.status === 'pending' && (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '8px', background: 'rgba(232,184,92,0.15)', color: '#e8b85c' }}>pending</span>
                          )}
                          {member.status === 'active' && member.role !== 'owner' && (
                            <span style={{ fontSize: '11px', color: '#4ade80' }}>✓ active</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {role === 'owner' && member.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(member.id)}
                        disabled={removingId === member.id}
                        style={{ fontSize: '12px', color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', flexShrink: 0, fontWeight: 600, opacity: removingId === member.id ? 0.5 : 1 }}
                      >
                        {removingId === member.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))}
                {(!team.team_members || team.team_members.length === 0) && (
                  <p style={{ padding: '24px 20px', color: '#6b7aa3', fontSize: '13px', margin: 0 }}>No members yet — add your first team member below.</p>
                )}
              </div>
            </div>

            {/* Add member (owner only) */}
            {role === 'owner' && memberCount < team.max_members && (
              <div style={glass}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f4fc', margin: '0 0 4px' }}>Add Team Member</h2>
                  <p style={{ fontSize: '12px', color: '#6b7aa3', margin: 0 }}>{team.max_members - memberCount} slot{team.max_members - memberCount !== 1 ? 's' : ''} remaining</p>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="colleague@doh.gov.ph"
                      onKeyDown={e => { if (e.key === 'Enter') addMember() }}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#e8ecf5', fontSize: '14px', outline: 'none' }}
                    />
                    <button
                      onClick={addMember}
                      disabled={inviting || !inviteEmail.trim()}
                      style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: inviting || !inviteEmail.trim() ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', color: '#fff', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', opacity: inviting || !inviteEmail.trim() ? 0.6 : 1 }}
                    >
                      {inviting ? '…' : 'Add'}
                    </button>
                  </div>
                  {inviteResult && <p style={{ marginTop: '10px', fontSize: '12px', color: '#86efac' }}>{inviteResult}</p>}
                  {inviteError && <p style={{ marginTop: '10px', fontSize: '12px', color: '#fca5a5' }}>{inviteError}</p>}
                  <p style={{ marginTop: '10px', fontSize: '11px', color: '#6b7aa3', lineHeight: 1.5 }}>
                    If the person already has a JOANResearchOS account, they'll be added immediately. If not, their invite is recorded — they get team access as soon as they sign up with this email.
                  </p>
                </div>
              </div>
            )}

            {role === 'owner' && memberCount >= team.max_members && (
              <div style={{ ...glass, padding: '16px 20px', background: 'rgba(232,184,92,0.06)', border: '1px solid rgba(232,184,92,0.25)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#e8b85c' }}>
                  Your team is full ({team.max_members}/{team.max_members} members). Contact <a href="mailto:yolymarorfiano@yahoo.com" style={{ color: '#fbbf24' }}>yolymarorfiano@yahoo.com</a> to upgrade to the Institution plan for up to 20 members.
                </p>
              </div>
            )}

            {/* Member info */}
            {role === 'member' && (
              <div style={{ ...glass, padding: '16px 20px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#8b9bc4', lineHeight: 1.6 }}>
                  You are a member of <strong style={{ color: '#c4b5fd' }}>{team.name}</strong>. You have unlimited analysis access through this team. Contact your team admin to manage membership.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </main>
  )
}
