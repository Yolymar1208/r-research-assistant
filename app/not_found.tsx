'use client'

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ width: '56px', height: '56px', background: '#1a3a5c', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '22px' }}>J</span>
        </div>
        <h1 style={{ fontSize: '64px', fontWeight: 800, color: '#1a3a5c', margin: '0 0 8px', lineHeight: 1 }}>404</h1>
        <p style={{ fontSize: '17px', fontWeight: 600, color: '#1a3a5c', marginBottom: '8px' }}>Page not found</p>
        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '32px' }}>
          The page you're looking for doesn't exist, or may have moved. Your analyses and account are safe.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/" style={{ background: '#1a3a5c', color: '#fff', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            Back to app
          </a>
          <a href="/history" style={{ background: '#fff', color: '#1a3a5c', border: '1px solid #e2e8f0', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            View history
          </a>
        </div>
      </div>
    </main>
  )
}
