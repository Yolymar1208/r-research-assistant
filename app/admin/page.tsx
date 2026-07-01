'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/app/lib/supabase'
import Starfield from '@/app/components/Starfield'

const supabase = createClient()

interface UserRecord {
  id: string
  email: string
  plan: string
  analyses_limit: number
  created_at: string
  plan_started_at: string | null
  plan_expires_at: string | null
}

interface UsageRecord {
  user_id: string
  analyses_count: number
  month_year: string
}

const ADMIN_EMAIL = 'yolymarorfiano@yahoo.com'

const PLAN_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  pro: { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  institution: { bg: 'rgba(124,92,255,0.15)', text: '#c4b5fd', border: 'rgba(124,92,255,0.3)' },
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [usage, setUsage] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [successId, setSuccessId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email || ''
      setCurrentUserEmail(email)
      if (email === ADMIN_EMAIL) {
        loadData()
      } else {
        setError('Access denied. Admin only.')
        setLoading(false)
      }
    })
  }, [])

  async function loadData() {
    setLoading(true)
    const [usersRes, usageRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/usage'),
    ])
    const usersData = await usersRes.json()
    const usageData = await usageRes.json()
    if (usersData.success) setUsers(usersData.users)
    if (usageData.success) setUsage(usageData.usage)
    setLoading(false)
  }

  async function upgradePlan(userId: string, plan: string) {
    setUpdating(userId)
    const res = await fetch('/api/admin/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan }),
    })
    const data = await res.json()
    if (data.success) {
      setSuccessId(userId)
      setTimeout(() => setSuccessId(null), 2000)
      await loadData()
    } else {
      alert('Failed to upgrade: ' + data.error)
    }
    setUpdating(null)
  }

  const now = new Date()
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  function getUsageForUser(userId: string): number {
    const record = usage.find(u => u.user_id === userId && u.month_year === monthYear)
    return record?.analyses_count ?? 0
  }

  const totalAnalysesThisMonth = useMemo(() =>
    usage.filter(u => u.month_year === monthYear).reduce((sum, u) => sum + u.analyses_count, 0),
    [usage, monthYear]
  )

  const recentSignups = useMemo(() =>
    [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [users]
  )

  const nearLimitUsers = useMemo(() =>
    users.filter(u => {
      if (u.plan !== 'free') return false
      const count = getUsageForUser(u.id)
      return count >= 4
    }),
    [users, usage]
  )

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      if (planFilter !== 'all' && u.plan !== planFilter) return false
      if (q && !u.email.toLowerCase().includes(q)) return false
      return true
    })
  }, [users, search, planFilter])

  const glass = {
    background: 'rgba(18, 26, 48, 0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(124,92,255,0.2)',
    borderRadius: '14px',
  } as React.CSSProperties

  if (loading) return (
    <main style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <Starfield />
      <p style={{ color: '#8b9bc4', position: 'relative', zIndex: 1 }}>Loading admin dashboard…</p>
    </main>
  )

  if (error) return (
    <main style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <Starfield />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{ color: '#fca5a5', fontSize: '18px', fontWeight: 700 }}>⛔ {error}</p>
        <a href="/" style={{ color: '#8fb4ff', fontSize: '14px' }}>← Back to app</a>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif", padding: '2rem' }}>
      <Starfield />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f1f4fc', margin: '0 0 4px', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif', letterSpacing: '-0.3px' }}>
              Admin Dashboard
            </h1>
            <p style={{ color: '#6b7aa3', fontSize: '13px', margin: 0 }}>JOANResearchOS · {currentUserEmail}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={loadData}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, color: '#aab4d4' }}
            >
              ↻ Refresh
            </button>
            <a href="/" style={{ background: 'linear-gradient(135deg, #7c5cff 0%, #2e75b6 100%)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
              ← Back to app
            </a>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'Total Users', value: users.length, color: '#f1f4fc' },
            { label: 'Free', value: users.filter(u => u.plan === 'free').length, color: '#9ca3af' },
            { label: 'Pro', value: users.filter(u => u.plan === 'pro').length, color: '#60a5fa' },
            { label: 'Institution', value: users.filter(u => u.plan === 'institution').length, color: '#c4b5fd' },
            { label: 'Analyses This Month', value: totalAnalysesThisMonth, color: '#86efac' },
            { label: 'Near Limit', value: nearLimitUsers.length, color: '#e8b85c' },
          ].map((stat) => (
            <div key={stat.label} style={{ ...glass, padding: '18px 20px' }}>
              <p style={{ fontSize: '11px', color: '#6b7aa3', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
              <p style={{ fontSize: '30px', fontWeight: 800, color: stat.color, margin: 0, fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Near limit alert */}
        {nearLimitUsers.length > 0 && (
          <div style={{ ...glass, padding: '14px 18px', marginBottom: '20px', border: '1px solid rgba(232,184,92,0.35)', background: 'rgba(232,184,92,0.06)' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8b85c', margin: '0 0 8px' }}>
              ⚡ {nearLimitUsers.length} free user{nearLimitUsers.length > 1 ? 's' : ''} at or near their limit — potential upgrade opportunity
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {nearLimitUsers.map(u => (
                <span key={u.id} style={{ fontSize: '12px', color: '#fbbf24', background: 'rgba(232,184,92,0.1)', border: '1px solid rgba(232,184,92,0.3)', padding: '3px 10px', borderRadius: '10px' }}>
                  {u.email} ({getUsageForUser(u.id)}/5)
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

          {/* Main users table */}
          <div style={{ ...glass, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f4fc', margin: 0, flex: 1 }}>All Users</h2>
              <input
                type="text"
                placeholder="Search email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: '13px', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#e8ecf5', outline: 'none', width: '180px' }}
              />
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                style={{ fontSize: '13px', padding: '6px 10px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', background: 'rgba(13,20,40,0.8)', color: '#e8ecf5' }}
              >
                <option value="all">All plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="institution">Institution</option>
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Email', 'Plan', 'Usage', 'Joined', 'Change Plan'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7aa3', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7aa3' }}>No users match your filters</td></tr>
                  ) : filteredUsers.map((user) => {
                    const userUsage = getUsageForUser(user.id)
                    const isNearLimit = user.plan === 'free' && userUsage >= 4
                    const s = PLAN_STYLES[user.plan] || PLAN_STYLES.free
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '11px 16px', color: isNearLimit ? '#fbbf24' : '#e8ecf5', fontWeight: isNearLimit ? 600 : 400 }}>
                          {user.email}
                          {isNearLimit && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#e8b85c' }}>⚡ near limit</span>}
                          {successId === user.id && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#86efac' }}>✓ updated</span>}
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                            {user.plan}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', color: isNearLimit ? '#e8b85c' : '#8b9bc4' }}>
                          {user.plan === 'free' ? `${userUsage} / 5` : '∞'}
                        </td>
                        <td style={{ padding: '11px 16px', color: '#6b7aa3', whiteSpace: 'nowrap' }}>
                          {new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            {['free', 'pro', 'institution'].map((plan) => {
                              const ps = PLAN_STYLES[plan]
                              const isCurrent = user.plan === plan
                              return (
                                <button
                                  key={plan}
                                  onClick={() => upgradePlan(user.id, plan)}
                                  disabled={isCurrent || updating === user.id}
                                  style={{
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                    cursor: isCurrent || updating === user.id ? 'default' : 'pointer',
                                    border: `1px solid ${isCurrent ? 'rgba(255,255,255,0.08)' : ps.border}`,
                                    background: isCurrent ? 'rgba(255,255,255,0.03)' : ps.bg,
                                    color: isCurrent ? '#4a5568' : ps.text,
                                    opacity: updating === user.id ? 0.5 : 1,
                                    textTransform: 'capitalize',
                                    transition: 'opacity 0.15s',
                                  }}
                                >
                                  {updating === user.id ? '…' : plan}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '12px', color: '#4a5568', margin: 0 }}>
                {filteredUsers.length} of {users.length} users shown
              </p>
            </div>
          </div>

          {/* Sidebar: Recent signups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ ...glass, padding: '18px 20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f4fc', margin: '0 0 14px' }}>Recent Signups</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentSignups.map((u) => {
                  const s = PLAN_STYLES[u.plan] || PLAN_STYLES.free
                  return (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', color: '#e8ecf5', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                        <p style={{ fontSize: '11px', color: '#6b7aa3', margin: 0 }}>
                          {new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: '10px', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', flexShrink: 0 }}>
                        {u.plan}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick upgrade guide */}
            <div style={{ ...glass, padding: '18px 20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f4fc', margin: '0 0 10px' }}>Upgrade Workflow</h3>
              <ol style={{ margin: 0, paddingLeft: '16px', color: '#8b9bc4', fontSize: '12px', lineHeight: 1.8 }}>
                <li>User sends GCash/bank payment</li>
                <li>Find their email in the table</li>
                <li>Click <strong style={{ color: '#60a5fa' }}>pro</strong> or <strong style={{ color: '#c4b5fd' }}>institution</strong></li>
                <li>Plan activates instantly ✓</li>
              </ol>
              <p style={{ fontSize: '11px', color: '#4a5568', margin: '10px 0 0' }}>
                Contact: <a href="mailto:yolymarorfiano@yahoo.com" style={{ color: '#8fb4ff' }}>yolymarorfiano@yahoo.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
