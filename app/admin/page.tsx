'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'
import Starfield from '@/app/components/Starfield'

const supabase = createClient()

const ADMIN_EMAIL = 'yolymarorfiano@yahoo.com'

interface UserRecord {
  id: string
  email: string
  plan: string
  analyses_limit: number
  created_at: string
  current_month_count?: number
}

const PLANS = [
  { key: 'free',        label: 'Free',        price: '₱0',         color: '#6b7aa3',  bg: 'rgba(107,122,163,0.1)',  border: 'rgba(107,122,163,0.3)' },
  { key: 'researcher',  label: 'Researcher',  price: '₱1,499/mo',  color: '#60a5fa',  bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.3)' },
  { key: 'team',        label: 'Team',        price: '₱3,499/mo',  color: '#c4b5fd',  bg: 'rgba(124,92,255,0.1)',   border: 'rgba(124,92,255,0.3)' },
  { key: 'institution', label: 'Institution', price: '₱8,999/mo',  color: '#e8b85c',  bg: 'rgba(232,184,92,0.1)',   border: 'rgba(232,184,92,0.3)' },
]

const glass: React.CSSProperties = {
  background: 'rgba(18,26,48,0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(124,92,255,0.2)',
  borderRadius: '14px',
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [upgradingId, setUpgradingId] = useState<string | null>(null)
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, free: 0, researcher: 0, team: 0, institution: 0, thisMonth: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.email !== ADMIN_EMAIL) { setLoading(false); return }
      setIsAdmin(true)
      await loadUsers()
      setLoading(false)
    })
  }, [])

  async function loadUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (data.success) {
      setUsers(data.users)
      const u = data.users as UserRecord[]
      setStats({
        total: u.length,
        free: u.filter(x => x.plan === 'free').length,
        researcher: u.filter(x => x.plan === 'researcher').length,
        team: u.filter(x => x.plan === 'team').length,
        institution: u.filter(x => x.plan === 'institution').length,
        thisMonth: u.reduce((sum, x) => sum + (x.current_month_count || 0), 0),
      })
    }
  }

  async function upgradePlan(userId: string, plan: string) {
    setUpgradingId(userId)
    setUpgradeSuccess(null)
    setUpgradeError(null)
    const res = await fetch('/api/admin/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan }),
    })
    const data = await res.json()
    if (data.success) {
      setUpgradeSuccess(`${data.label} activated`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan, analyses_limit: plan === 'free' ? 3 : 999999 } : u))
      setTimeout(() => setUpgradeSuccess(null), 3000)
    } else {
      setUpgradeError(data.error || 'Upgrade failed')
      setTimeout(() => setUpgradeError(null), 4000)
    }
    setUpgradingId(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = search === '' || u.email.toLowerCase().includes(search.toLowerCase())
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan
    return matchSearch && matchPlan
  })

  const getPlanConfig = (plan: string) => PLANS.find(p => p.key === plan) || PLANS[0]

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070f' }}>
      <p style={{ color: '#8b9bc4' }}>Verifying admin access…</p>
    </main>
  )

  if (!isAdmin) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070f' }}>
      <p style={{ color: '#fca5a5' }}>Access denied — admin only.</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Starfield />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, background: 'rgba(13,20,40,0.7)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(124,92,255,0.18)', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>J</span>
            </div>
            <span style={{ color: '#f1f4fc', fontWeight: 700, fontSize: '15px' }}>JOANResearchOS</span>
            <span style={{ color: '#e8b85c', fontSize: '12px', fontWeight: 700, background: 'rgba(232,184,92,0.1)', border: '1px solid rgba(232,184,92,0.3)', padding: '2px 8px', borderRadius: '8px' }}>ADMIN</span>
          </div>
          <a href="/" style={{ fontSize: '13px', color: '#8fb4ff', textDecoration: 'none', border: '1px solid rgba(124,92,255,0.3)', padding: '6px 14px', borderRadius: '8px' }}>← App</a>
        </div>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 1.5rem', position: 'relative', zIndex: 10 }}>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', flex: 1 }}>
            {[
              { label: 'Total users', value: stats.total, color: '#f1f4fc' },
              { label: 'Free', value: stats.free, color: '#6b7aa3' },
              { label: 'Researcher', value: stats.researcher, color: '#60a5fa' },
              { label: 'Team', value: stats.team, color: '#c4b5fd' },
              { label: 'Institution', value: stats.institution, color: '#e8b85c' },
              { label: 'Analyses this month', value: stats.thisMonth, color: '#4ade80' },
            ].map(s => (
              <div key={s.label} style={{ ...glass, padding: '16px 20px' }}>
                <p style={{ fontSize: '28px', fontWeight: 900, color: s.color, margin: '0 0 4px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>{s.value}</p>
                <p style={{ fontSize: '12px', color: '#6b7aa3', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={loadUsers}
            style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(124,92,255,0.3)', background: 'rgba(124,92,255,0.08)', color: '#c4b5fd', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Toast notifications */}
        {upgradeSuccess && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', color: '#86efac', fontSize: '13px', fontWeight: 600 }}>
            ✓ {upgradeSuccess}
          </div>
        )}
        {upgradeError && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', color: '#fca5a5', fontSize: '13px' }}>
            ✗ {upgradeError}
          </div>
        )}

        {/* Filters */}
        <div style={{ ...glass, padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '9px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#e8ecf5', fontSize: '13px', outline: 'none' }}
          />
          <select
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(13,20,40,0.8)', color: '#e8ecf5', fontSize: '13px' }}
          >
            <option value="all">All plans</option>
            {PLANS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <span style={{ fontSize: '12px', color: '#6b7aa3' }}>{filtered.length} users</span>
        </div>

        {/* User list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(user => {
            const planCfg = getPlanConfig(user.plan)
            return (
              <div key={user.id} style={{ ...glass, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>

                  {/* User info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#e8ecf5' }}>{user.email}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: planCfg.bg, color: planCfg.color, border: `1px solid ${planCfg.border}` }}>
                        {planCfg.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7aa3' }}>
                      Joined {new Date(user.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {user.current_month_count !== undefined && ` · ${user.current_month_count} analyses this month`}
                      {user.plan === 'free' && ` · ${user.analyses_limit - (user.current_month_count || 0)} remaining`}
                    </p>
                  </div>

                  {/* Plan upgrade buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#6b7aa3', marginRight: '4px' }}>Set plan:</span>
                    {PLANS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => upgradePlan(user.id, p.key)}
                        disabled={upgradingId === user.id || user.plan === p.key}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: '7px',
                          border: `1px solid ${p.border}`,
                          background: user.plan === p.key ? p.bg : 'transparent',
                          color: user.plan === p.key ? p.color : '#6b7aa3',
                          cursor: user.plan === p.key || upgradingId === user.id ? 'not-allowed' : 'pointer',
                          opacity: upgradingId === user.id ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {upgradingId === user.id ? '…' : user.plan === p.key ? `✓ ${p.label}` : p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team plan note */}
                {user.plan === 'team' && (
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(124,92,255,0.06)', border: '1px solid rgba(124,92,255,0.2)', borderRadius: '8px', fontSize: '12px', color: '#8b9bc4' }}>
                    👥 Team plan — user can create a team workspace at <code style={{ color: '#c4b5fd' }}>/team</code> and add up to 4 members.
                    {' '}<a href="/team" style={{ color: '#8fb4ff', textDecoration: 'none' }}>View team management →</a>
                  </div>
                )}
                {user.plan === 'institution' && (
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(232,184,92,0.06)', border: '1px solid rgba(232,184,92,0.2)', borderRadius: '8px', fontSize: '12px', color: '#8b9bc4' }}>
                    🏛️ Institution plan — up to 20 members. Team max_members updated automatically.
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7aa3', fontSize: '14px' }}>
              No users match your search.
            </div>
          )}
        </div>

        {/* Pricing reference card */}
        <div style={{ ...glass, padding: '20px 24px', marginTop: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f4fc', margin: '0 0 16px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>
            Plan Reference
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {[
              { plan: 'Free',        price: '₱0',         limit: '3 analyses/month',   members: '1 user',     color: '#6b7aa3' },
              { plan: 'Researcher',  price: '₱1,499/mo',  limit: 'Unlimited analyses', members: '1 user',     color: '#60a5fa' },
              { plan: 'Team',        price: '₱3,499/mo',  limit: 'Unlimited analyses', members: 'Up to 5',    color: '#c4b5fd' },
              { plan: 'Institution', price: '₱8,999/mo',  limit: 'Unlimited analyses', members: 'Up to 20',   color: '#e8b85c' },
            ].map(p => (
              <div key={p.plan} style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontWeight: 700, color: p.color, margin: '0 0 6px', fontSize: '13px' }}>{p.plan} — {p.price}</p>
                <p style={{ fontSize: '12px', color: '#8b9bc4', margin: '0 0 2px' }}>✓ {p.limit}</p>
                <p style={{ fontSize: '12px', color: '#8b9bc4', margin: 0 }}>✓ {p.members}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#4a6080', margin: '16px 0 0', lineHeight: 1.6 }}>
            Payment via GCash or bank transfer → upgrade user here → if upgrading to Team/Institution, user creates their team at <code style={{ color: '#c4b5fd' }}>/team</code>.
          </p>
        </div>

      </div>
    </main>
  )
}
