'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'

const supabase = createClient()

const TEST_LABELS: Record<string, string> = {
  descriptive_statistics: 'Descriptive Statistics',
  independent_t_test: 'Independent t-test',
  paired_t_test: 'Paired t-test',
  one_way_anova: 'One-Way ANOVA',
  chi_square: 'Chi-Square',
  pearson_correlation: 'Pearson Correlation',
  mann_whitney: 'Mann-Whitney U',
  wilcoxon_signed_rank: 'Wilcoxon Signed-Rank',
  kruskal_wallis: 'Kruskal-Wallis',
  spearman_correlation: 'Spearman Correlation',
  fishers_exact: "Fisher's Exact",
  mcnemar: "McNemar's",
  logistic_regression: 'Logistic Regression',
  linear_regression: 'Linear Regression',
}

interface HistoryRecord {
  id: string
  dataset_name: string
  research_question: string
  selected_test: string
  execution_success: boolean
  created_at: string
  ai_interpretation: string
  r_script: string
  raw_output: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || '')
    })
    fetch('/api/history')
      .then(r => r.json())
      .then(data => {
        if (data.success) setHistory(data.history)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function downloadRScript(record: HistoryRecord) {
    const blob = new Blob([record.r_script], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis_${record.id.slice(0, 8)}.R`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getTab(id: string): string {
    return activeTab[id] || 'interpretation'
  }

  function setTab(id: string, tab: string) {
    setActiveTab(prev => ({ ...prev, [id]: tab }))
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1a3a5c', margin: '0 0 2px' }}>Analysis History</h1>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{userEmail}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/" style={{ background: '#1a3a5c', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
              ← Back to app
            </a>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 2rem' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading your analysis history…</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '32px', marginBottom: '16px' }}>📊</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#1a3a5c', marginBottom: '8px' }}>No analyses yet</p>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Your completed analyses will appear here.</p>
            <a href="/" style={{ background: '#1a3a5c', color: '#fff', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
              Start an analysis
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{history.length} analyses — last 50 shown</p>

            {history.map((record) => (
              <div key={record.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>

                {/* Record header */}
                <div
                  onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: record.execution_success ? '#dcfce7' : '#fef2f2',
                        color: record.execution_success ? '#166534' : '#991b1b',
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px'
                      }}>
                        {record.execution_success ? '✓ Success' : '✗ Failed'}
                      </span>
                      <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>
                        {TEST_LABELS[record.selected_test] || record.selected_test}
                      </span>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {new Date(record.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {record.research_question}
                    </p>
                    <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                      📁 {record.dataset_name}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadRScript(record) }}
                      style={{ fontSize: '12px', color: '#2e75b6', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ↓ .R
                    </button>
                    <span style={{ fontSize: '18px', color: '#888' }}>{expanded === record.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded content */}
                {expanded === record.id && (
                  <div style={{ borderTop: '1px solid #f0f0f0' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', background: '#f8fafc' }}>
                      {[
                        { key: 'interpretation', label: 'AI Interpretation' },
                        { key: 'output', label: 'Raw R Output' },
                        { key: 'script', label: 'R Script' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setTab(record.id, tab.key)}
                          style={{
                            padding: '10px 16px',
                            fontSize: '13px',
                            fontWeight: getTab(record.id) === tab.key ? 600 : 400,
                            color: getTab(record.id) === tab.key ? '#1a3a5c' : '#888',
                            background: 'none',
                            border: 'none',
                            borderBottom: getTab(record.id) === tab.key ? '2px solid #1a3a5c' : '2px solid transparent',
                            cursor: 'pointer',
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: '20px' }}>
                      {getTab(record.id) === 'interpretation' && (
                        <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.7 }}>
                          {record.ai_interpretation
                            ? record.ai_interpretation.split('\n').map((line, i) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return <p key={i} style={{ fontWeight: 700, color: '#1a3a5c', marginTop: '16px', marginBottom: '4px' }}>{line.replace(/\*\*/g, '')}</p>
                                }
                                if (line.trim() === '') return <br key={i} />
                                return <p key={i} style={{ margin: '4px 0' }}>{line.replace(/\*\*([^*]+)\*\*/g, '$1')}</p>
                              })
                            : <p style={{ color: '#888', fontStyle: 'italic' }}>No interpretation available.</p>
                          }
                        </div>
                      )}

                      {getTab(record.id) === 'output' && (
                        <pre style={{ background: '#1a1a2e', color: '#d4d4d4', padding: '16px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6, margin: 0 }}>
                          {record.raw_output || '(no output)'}
                        </pre>
                      )}

                      {getTab(record.id) === 'script' && (
                        <pre style={{ background: '#0d1117', color: '#58a6ff', padding: '16px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6, margin: 0 }}>
                          {record.r_script || '(no script)'}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
