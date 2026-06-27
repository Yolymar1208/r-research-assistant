'use client'

import { useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createClient()

    // Exchange the code in URL for a session
    supabase.auth.exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          console.error('Auth callback error:', error)
          window.location.replace('/login?error=auth_failed')
        } else {
          window.location.replace('/')
        }
      })
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', background: '#1a3a5c', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '20px' }}>J</span>
        </div>
        <p style={{ color: '#555', fontSize: '14px' }}>Completing sign in…</p>
        <p style={{ color: '#999', fontSize: '12px', marginTop: '8px' }}>You will be redirected automatically</p>
      </div>
    </main>
  )
}
