'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App Error Boundary]', error)
  }, [error])

  return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '460px' }}>
        <div style={{ width: '56px', height: '56px', background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '24px' }}>
          ⚠
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1a3a5c', marginBottom: '8px' }}>Something went wrong</h1>
        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '8px' }}>
          This was an unexpected error in the app itself — not a failed analysis. Your saved analysis history and
          account are unaffected.
        </p>
        {error.digest && (
          <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '24px', fontFamily: 'monospace' }}>
            Error reference: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
          <button
            onClick={() => reset()}
            style={{ background: '#1a3a5c', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
          <a href="/" style={{ background: '#fff', color: '#1a3a5c', border: '1px solid #e2e8f0', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            Back to app
          </a>
        </div>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '24px' }}>
          If this keeps happening, email{' '}
          <a href="mailto:yolymarorfiano@yahoo.com" style={{ color: '#2e75b6' }}>yolymarorfiano@yahoo.com</a> with the error reference above.
        </p>
      </div>
    </main>
  )
}
