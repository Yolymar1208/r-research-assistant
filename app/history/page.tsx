'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/app/lib/supabase'
import { downloadHistoryReportAsPdf } from '@/app/lib/pdfReport'

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
  epidemic_curve: 'Epidemic Curve',
  attack_rate_table: 'Attack Rate Table',
  age_sex_pyramid: 'Age-Sex Pyramid',
  survival_analysis: 'Survival Analysis',
  moving_average: 'Moving Average (7-day)',
}

const TEST_GROUPS: Record<string, string> = {
  descriptive_statistics: 'Parametric', independent_t_test: 'Parametric', paired_t_test: 'Parametric',
  one_way_anova: 'Parametric', chi_square: 'Parametric', pearson_correlation: 'Parametric',
  mann_whitney: 'Non-Parametric', wilcoxon_signed_rank: 'Non-Parametric', kruskal_wallis: 'Non-Parametric',
  spearman_correlation: 'Non-Parametric', fishers_exact: 'Non-Parametric', mcnemar: 'Non-Parametric',
  logistic_regression: 'Regression', linear_regression: 'Regression',
  epidemic_curve: 'Epidemiology', attack_rate_table: 'Epidemiology', age_sex_pyramid: 'Epidemiology',
  survival_analysis: 'Epidemiology', moving_average: 'Epidemiology',
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
  plan_json?: Record<string, unknown> | null
}

type StatusFilter = 'all' | 'success' | 'failed'

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})
  const [userEmail, setUserEmail] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null)
  const [reportErrorId, setReportErrorId] = useState<string | null>(null)

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

  const availableGroups = useMemo(() => {
    const groups = new Set(history.map(h => TEST_GROUPS[h.selected_test] || 'Other'))
    return Array.from(groups).sort()
  }, [history])

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return history.filter((record) => {
      if (statusFilter === 'success' && !record.execution_success) return false
      if (statusFilter === 'failed' && record.execution_success) return false
      if (groupFilter !== 'all' && (TEST_GROUPS[record.selected_test] || 'Other') !== groupFilter) return false
      if (q) {
        const haystack = `${record.research_question} ${record.dataset_name} ${TEST_LABELS[record.selected_test] || record.selected_test}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [history, searchQuery, groupFilter, statusFilter])

  function downloadRScript(record: HistoryRecord) {
    const blob = new Blob([record.r_script], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis_${record.id.slice(0, 8)}.R`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadRawOutput(record: HistoryRecord) {
    const blob = new Blob([record.raw_output || '(no output)'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `r_output_${record.id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Reconstructs a best-effort report from what's actually persisted in
  // analysis_history. Fields not stored at save time (hypothesis, variable
  // names, rationale) are sent empty rather than invented — the PDF skill
  // / report generator is expected to omit blank fields gracefully.
  async function downloadPDFReport(record: HistoryRecord) {
    setGeneratingReportId(record.id)
    setReportErrorId(null)
    try {
      // Use stored plan_json if available (analyses run after 2026-07-02) for
      // byte-perfect PDF regeneration. Fall back to best-effort reconstruction
      // for older history rows that don't have plan_json.
      const enrichedRecord = record.plan_json
        ? { ...record, plan_json: record.plan_json }
        : record
      await downloadHistoryReportAsPdf(enrichedRecord)
    } catch {
      setReportErrorId(record.id)
    } finally {
      setGeneratingReportId(null)
    }
  }

  function getTab(id: string): string {
    return activeTab[id] || 'interpretation'
  }

  function setTab(id: string, tab: string) {
    setActiveTab(prev => ({ ...prev, [id]: tab }))
  }

  const hasActiveFilters = searchQuery.trim() !== '' || groupFilter !== 'all' || statusFilter !== 'all'

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

        {!loading && history.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by question, dataset, or test…"
              style={{ flex: '1 1 220px', minWidth: '180px', fontSize: '13px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1a1a1a', outline: 'none' }}
            />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              style={{ fontSize: '13px', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#444', background: '#fff' }}
            >
              <option value="all">All test types</option>
              {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{ fontSize: '13px', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#444', background: '#fff' }}
            >
              <option value="all">All results</option>
              <option value="success">Successful only</option>
              <option value="failed">Failed only</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearchQuery(''); setGroupFilter('all'); setStatusFilter('all') }}
                style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

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
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>No analyses match your current filters.</p>
            <button
              onClick={() => { setSearchQuery(''); setGroupFilter('all'); setStatusFilter('all') }}
              style={{ fontSize: '13px', color: '#2e75b6', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              {hasActiveFilters
                ? `${filteredHistory.length} of ${history.length} analyses match your filters`
                : `${history.length} analyses — last 50 shown`}
            </p>

            {filteredHistory.map((record) => (
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
                    <a
                      href={`/?question=${encodeURIComponent(record.research_question)}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: '12px', color: '#7c5cff', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      ↺ Re-run
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadRScript(record) }}
                      style={{ fontSize: '12px', color: '#2e75b6', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ↓ .R
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadRawOutput(record) }}
                      style={{ fontSize: '12px', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ↓ Output
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadPDFReport(record) }}
                      disabled={generatingReportId === record.id}
                      style={{ fontSize: '12px', color: '#fff', background: '#1a3a5c', border: '1px solid #1a3a5c', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, opacity: generatingReportId === record.id ? 0.6 : 1 }}
                    >
                      {generatingReportId === record.id ? '…' : '↓ PDF'}
                    </button>
                    <span style={{ fontSize: '18px', color: '#888' }}>{expanded === record.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {reportErrorId === record.id && (
                  <div style={{ padding: '0 20px 12px', fontSize: '12px', color: '#b45309' }}>
                    Couldn't regenerate the PDF for this older analysis — some plan details weren't saved at the time. The R Script and Output downloads above always work.
                  </div>
                )}

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
