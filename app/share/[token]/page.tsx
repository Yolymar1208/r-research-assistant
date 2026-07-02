'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import AnalysisResults from '@/app/components/AnalysisResults'
import Starfield from '@/app/components/Starfield'
import type { AnalysisResult } from '@/app/types'

const supabase = createClient()

interface SharedData {
  dataset_name: string
  research_question: string
  selected_test: string
  ai_interpretation: string
  r_script: string
  raw_output: string
  execution_success: boolean
  execution_time_ms: number
  plan: Record<string, unknown>
  created_at: string
  expires_at: string
}

export default function SharePage({ params }: { params: { token: string } }) {
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shared, setShared] = useState<SharedData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const loggedIn = !!data.user
      setIsLoggedIn(loggedIn)
      setAuthChecked(true)
      if (!loggedIn) { setLoading(false); return }

      // Fetch shared analysis using the token
      supabase
        .from('shared_analyses')
        .select('*')
        .eq('token', params.token)
        .single()
        .then(({ data: row, error: err }) => {
          if (err || !row) { setError('This link is invalid or has expired.'); setLoading(false); return }
          // Check expiry client-side as well
          if (new Date(row.expires_at) < new Date()) { setError('This share link has expired (links are valid for 30 days).'); setLoading(false); return }
          setShared(row)
          setLoading(false)
        })
    })
  }, [params.token])

  const result: AnalysisResult | null = shared ? {
    plan: shared.plan as unknown as AnalysisResult['plan'],
    rScript: shared.r_script,
    execution: {
      success: shared.execution_success,
      rawOutput: shared.raw_output,
      errorMessage: null,
      executionTimeMs: shared.execution_time_ms,
      rScript: shared.r_script,
    },
    aiInterpretation: shared.ai_interpretation,
    completedAt: shared.created_at,
  } : null

  return (
    <main style={{ minHeight: '100vh', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Starfield />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, background: 'rgba(13,20,40,0.7)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(124,92,255,0.18)', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', boxShadow: '0 0 0 1px rgba(124,92,255,0.4)' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>J</span>
            </div>
            <span style={{ color: '#f1f4fc', fontWeight: 700, fontSize: '16px' }}>JOANResearchOS</span>
            <span style={{ color: '#6b7aa3', fontSize: '12px', marginLeft: '4px' }}>· Shared Analysis</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href="/" style={{ fontSize: '13px', color: '#8fb4ff', textDecoration: 'none', border: '1px solid rgba(124,92,255,0.3)', padding: '6px 14px', borderRadius: '8px', background: 'rgba(124,92,255,0.08)' }}>
              ← Back to app
            </a>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 1.5rem', position: 'relative', zIndex: 10 }}>

        {/* Not logged in */}
        {authChecked && !isLoggedIn && (
          <div style={{ textAlign: 'center', padding: '80px 32px', background: 'rgba(18,26,48,0.65)', backdropFilter: 'blur(20px)', borderRadius: '18px', border: '1px solid rgba(124,92,255,0.25)' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f4fc', marginBottom: '12px', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
              Sign in to view this analysis
            </h2>
            <p style={{ color: '#8b9bc4', fontSize: '14px', lineHeight: 1.7, marginBottom: '32px', maxWidth: '420px', margin: '0 auto 32px' }}>
              This analysis was shared with you by a JOANResearchOS user. Create a free account or sign in to view the full results — including the R script and raw output.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={`/register?redirect=/share/${params.token}`}
                style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', boxShadow: '0 4px 16px rgba(124,92,255,0.35)' }}
              >
                Create free account →
              </a>
              <a
                href={`/login?redirect=/share/${params.token}`}
                style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, color: '#aab4d4', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)' }}
              >
                Sign in
              </a>
            </div>
            <p style={{ marginTop: '20px', fontSize: '12px', color: '#5a6890' }}>
              Free accounts include 5 analyses/month with all 19 statistical tests.
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoggedIn && loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8b9bc4' }}>Loading shared analysis…</div>
        )}

        {/* Error */}
        {isLoggedIn && !loading && error && (
          <div style={{ textAlign: 'center', padding: '60px 32px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>{error}</p>
            <a href="/" style={{ fontSize: '13px', color: '#8fb4ff' }}>← Go to app</a>
          </div>
        )}

        {/* Shared result */}
        {isLoggedIn && !loading && !error && result && shared && (
          <>
            {/* Share metadata banner */}
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#c4b5fd', margin: '0 0 2px' }}>
                  Shared Analysis · Read-only view
                </p>
                <p style={{ fontSize: '12px', color: '#6b7aa3', margin: 0 }}>
                  Dataset: {shared.dataset_name} · Shared {new Date(shared.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} · Expires {new Date(shared.expires_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <a href="/" style={{ fontSize: '12px', color: '#8fb4ff', background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.3)', padding: '5px 12px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                Run your own analysis →
              </a>
            </div>

            {/* The full result — same component as the main app */}
            <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(124,92,255,0.2)' }}>
              <AnalysisResults
                result={result}
                datasetName={shared.dataset_name}
              />
            </div>
          </>
        )}
      </div>
    </main>
  )
}
