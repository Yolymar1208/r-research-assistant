'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'

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

const ADMIN_EMAIL = 'antetokounmpo8@gmail.com'

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [usage, setUsage] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState('')

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
      await loadData()
    } else {
      alert('Failed to upgrade: ' + data.error)
    }
    setUpdating(null)
  }

  function getUsageForUser(userId: string): number {
    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const record = usage.find(u => u.user_id === userId && u.month_year === monthYear)
    return record?.analyses_count ?? 0
  }

  const planColors: Record<string, string> = {
    free: '#6b7280',
    pro: '#2e75b6',
    institution: '#1a3a5c',
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#666' }}>Loading admin dashboard…</p>
    </main>
  )

  if (error) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#991b1b', fontSize: '18px', fontWeight: 700 }}>⛔ {error}</p>
        <a href="/" style={{ color: '#2e75b6', fontSize: '14px' }}>← Back to app</a>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1a3a5c', margin: '0 0 4px' }}>Admin Dashboard</h1>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>JOANResearchOS · {currentUserEmail}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={loadData} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
              ↻ Refresh
            </button>
            <a href="/" style={{ background: '#1a3a5c', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
              ← Back to app
            </a>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Total Users', value: users.length },
            { label: 'Free Users', value: users.filter(u => u.plan === 'free').length },
            { label: 'Pro Users', value: users.filter(u => u.plan === 'pro').length },
            { label: 'Institution', value: users.filter(u => u.plan === 'institution').length },
          ].map((stat) => (
            <div key={stat.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#1a3a5c', margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a3a5c', margin: 0 }}>All Users</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Email', 'Plan', 'Analyses This Month', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px', color: '#1a1a1a' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: planColors[user.plan] + '20', color: planColors[user.plan], padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>
                        {user.plan}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>
                      {user.plan === 'free' ? `${getUsageForUser(user.id)} / 5` : '∞'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#888' }}>
                      {new Date(user.created_at).toLocaleDateString('en-PH')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {['free', 'pro', 'institution'].map((plan) => (
                          <button
                            key={plan}
                            onClick={() => upgradePlan(user.id, plan)}
                            disabled={user.plan === plan || updating === user.id}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: user.plan === plan ? 'default' : 'pointer',
                              border: '1px solid',
                              borderColor: user.plan === plan ? '#e2e8f0' : planColors[plan],
                              background: user.plan === plan ? '#f8fafc' : '#fff',
                              color: user.plan === plan ? '#999' : planColors[plan],
                              opacity: updating === user.id ? 0.5 : 1,
                              textTransform: 'capitalize',
                            }}
                          >
                            {updating === user.id ? '…' : plan}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}
