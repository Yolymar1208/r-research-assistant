'use client'

import { useState } from 'react'
import type { QualityIssue, QualityReport } from '@/app/lib/dataQualityChecker'

interface DataQualityReportProps {
  report: QualityReport
  onApplyFix: (issueId: string) => void
  onApplyAll: () => void
  onSkipIssue: (issueId: string) => void
  onProceed: () => void
  isProcessing?: boolean
}

const glass: React.CSSProperties = {
  background: 'rgba(18,26,48,0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(124,92,255,0.2)',
  borderRadius: '14px',
}

export default function DataQualityReport({
  report,
  onApplyFix,
  onApplyAll,
  onSkipIssue,
  onProceed,
  isProcessing = false,
}: DataQualityReportProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
  const [appliedIssues, setAppliedIssues] = useState<Set<string>>(new Set())
  const [skippedIssues, setSkippedIssues] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIssues)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedIssues(newSet)
  }

  const handleApplyFix = (id: string) => {
    onApplyFix(id)
    setAppliedIssues(prev => new Set([...prev, id]))
  }

  const handleSkipIssue = (id: string) => {
    onSkipIssue(id)
    setSkippedIssues(prev => new Set([...prev, id]))
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f87171'
      case 'warning': return '#fbbf24'
      case 'info': return '#60a5fa'
      default: return '#6b7aa3'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '•'
    }
  }

  const pendingIssues = report.issues.filter(
    i => !appliedIssues.has(i.id) && !skippedIssues.has(i.id)
  )
  const allResolved = pendingIssues.length === 0

  return (
    <div style={{ ...glass, padding: '24px', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#f1f4fc', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>
            📊 Data Quality Report
          </h2>
          <p style={{ color: '#8b9bc4', fontSize: '13px', margin: 0 }}>
            {report.dataStats.rowCount.toLocaleString()} rows · {report.dataStats.columnCount} columns
            {report.dataStats.dateRange && ` · Dates: ${report.dataStats.dateRange.min} to ${report.dataStats.dateRange.max}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '4px 12px', borderRadius: '20px' }}>
            ✅ {report.issues.length - pendingIssues.length} resolved
          </span>
          {pendingIssues.length > 0 && (
            <span style={{ fontSize: '12px', color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '4px 12px', borderRadius: '20px' }}>
              ⚠️ {pendingIssues.length} pending
            </span>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f4fc' }}>{report.summary.totalIssues}</div>
          <div style={{ fontSize: '11px', color: '#6b7aa3' }}>Total Issues</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f87171' }}>{report.summary.critical}</div>
          <div style={{ fontSize: '11px', color: '#6b7aa3' }}>Critical</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24' }}>{report.summary.warning}</div>
          <div style={{ fontSize: '11px', color: '#6b7aa3' }}>Warnings</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>{report.summary.info}</div>
          <div style={{ fontSize: '11px', color: '#6b7aa3' }}>Info</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>{report.summary.autoFixable}</div>
          <div style={{ fontSize: '11px', color: '#6b7aa3' }}>Auto-fixable</div>
        </div>
      </div>

      {/* Issues list */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {report.issues.map(issue => {
          const isApplied = appliedIssues.has(issue.id)
          const isSkipped = skippedIssues.has(issue.id)
          const isExpanded = expandedIssues.has(issue.id)
          const isPending = !isApplied && !isSkipped

          return (
            <div
              key={issue.id}
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: isApplied
                  ? 'rgba(74,222,128,0.06)'
                  : isSkipped
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(124,92,255,0.06)',
                border: `1px solid ${isApplied
                  ? 'rgba(74,222,128,0.3)'
                  : isSkipped
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(124,92,255,0.2)'
                }`,
                opacity: isSkipped ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                  {getSeverityIcon(issue.severity)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: isSkipped ? '#6b7aa3' : '#f1f4fc',
                    }}>
                      {issue.title}
                    </h3>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: `${getSeverityColor(issue.severity)}20`,
                      color: getSeverityColor(issue.severity),
                    }}>
                      {issue.severity.toUpperCase()}
                    </span>
                    {isApplied && (
                      <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>✓ Applied</span>
                    )}
                    {isSkipped && (
                      <span style={{ fontSize: '11px', color: '#6b7aa3', fontWeight: 600 }}>Skipped</span>
                    )}
                  </div>

                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8b9bc4', lineHeight: 1.5 }}>
                    {issue.description}
                  </p>

                  {isExpanded && (
                    <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                      <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>
                        Why this matters:
                      </p>
                      <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#aab4d4', lineHeight: 1.6 }}>
                        {issue.whyItMatters}
                      </p>
                      <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>
                        Suggested fix:
                      </p>
                      <p style={{ margin: '0', fontSize: '12px', color: '#cdd8ff', lineHeight: 1.5 }}>
                        {issue.suggestedFix}
                      </p>
                      {issue.affectedRows && issue.affectedRows.length > 0 && (
                        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#6b7aa3' }}>
                          Affects rows: {issue.affectedRows.slice(0, 10).map(r => r + 1).join(', ')}
                          {issue.affectedRows.length > 10 && ` +${issue.affectedRows.length - 10} more`}
                        </p>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => toggleExpand(issue.id)}
                      style={{
                        fontSize: '11px',
                        color: '#8b9bc4',
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>

                    {isPending && issue.autoFixable && (
                      <button
                        onClick={() => handleApplyFix(issue.id)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#4ade80',
                          background: 'rgba(74,222,128,0.1)',
                          border: '1px solid rgba(74,222,128,0.3)',
                          padding: '4px 14px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Apply fix
                      </button>
                    )}

                    {isPending && (
                      <button
                        onClick={() => handleSkipIssue(issue.id)}
                        style={{
                          fontSize: '11px',
                          color: '#6b7aa3',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Skip
                      </button>
                    )}

                    {isSkipped && (
                      <button
                        onClick={() => setSkippedIssues(prev => {
                          const newSet = new Set(prev)
                          newSet.delete(issue.id)
                          return newSet
                        })}
                        style={{
                          fontSize: '11px',
                          color: '#8b9bc4',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Undo skip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {pendingIssues.length > 0 && (
          <button
            onClick={onApplyAll}
            disabled={isProcessing}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c5cff, #2e75b6)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {isProcessing ? 'Applying...' : `Apply All (${pendingIssues.length})`}
          </button>
        )}

        <button
          onClick={onProceed}
          disabled={!allResolved}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            background: allResolved ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'rgba(255,255,255,0.06)',
            color: allResolved ? '#fff' : '#6b7aa3',
            fontWeight: 700,
            fontSize: '14px',
            cursor: allResolved ? 'pointer' : 'not-allowed',
            opacity: allResolved ? 1 : 0.5,
            marginLeft: 'auto',
          }}
        >
          {allResolved ? '✅ Proceed to Cleaning →' : 'Resolve all issues to continue'}
        </button>
      </div>
    </div>
  )
}
