'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import Starfield from '@/app/components/Starfield'
const supabase = createClient()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email address first')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password reset email sent. Check your inbox.')
    }
  }

  return (
    <main style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", padding: '2rem' }}>
      <Starfield />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #7c5cff 0%, #2e75b6 100%)',
            boxShadow: '0 0 0 1px rgba(124,92,255,0.4), 0 8px 24px rgba(124,92,255,0.35)',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '22px', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>J</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f4fc', margin: '0 0 4px', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif', letterSpacing: '-0.3px' }}>
            JOANResearchOS
          </h1>
          <p style={{ color: '#8b9bc4', fontSize: '14px', margin: 0 }}>Sign in to your research console</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(18, 26, 48, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '18px',
          border: '1px solid rgba(124,92,255,0.25)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.5)',
          padding: '32px',
        }}>

          {/* Google login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '11px',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, color: '#e8ecf5', marginBottom: '20px',
              transition: 'background 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: '#6b7aa3', fontSize: '12px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#aab4d4', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', color: '#e8ecf5',
                }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#aab4d4', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', color: '#e8ecf5',
                }}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: '#8fb4ff', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                Forgot password?
              </button>
            </div>

            {error && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#fca5a5', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#86efac', marginBottom: '16px' }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                background: 'linear-gradient(135deg, #7c5cff 0%, #2e75b6 100%)',
                boxShadow: '0 4px 16px rgba(124,92,255,0.35)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#8b9bc4' }}>
            No account?{' '}
            <a href="/register" style={{ color: '#8fb4ff', fontWeight: 600, textDecoration: 'none' }}>Create one free</a>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#5a6890' }}>
          <a href="/landing" style={{ color: '#5a6890' }}>← Back to home</a>
        </p>
      </div>
    </main>
  )
}
