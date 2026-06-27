'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (data.session) {
        window.location.replace('/')
      } else {
        // Try exchanging the code from URL
        const params = new URLSearchParams(window.location.search)
        const hash = window.location.hash
        if (hash || params.get('code')) {
          setTimeout(() => {
            window.location.replace('/')
          }, 2000)
        } else {
          window.location.replace('/login')
        }
      }
    }
    handleCallback()
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
