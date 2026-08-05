'use client'

import type { AdequacyResult, RequiredColumn } from '@/app/lib/researchQuestionParser'

interface DataAdequacyReportProps {
  result: AdequacyResult
  onProceed: () => void
  onBack: () => void
  isProcessing?: boolean
}

const glass: React.CSSProperties = {
  background: 'rgba(18,26,48,0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(124,92,255,0.2)',
  borderRadius: '14px',
}

export default function DataAdequacyReport({
  result,
  onProceed,
  onBack,
  isProcessing = false,
}: DataAdequacyReportProps) {
  const isAdequate = result.isAdequate
  const hasMissing = result.missingColumns.length > 0
  const hasFlagged = result.flaggedColumns.length > 0

  const getStatusIcon = () => {
    if (isAdequate) return '✅'
    if (hasMissing) return '❌'
    if (hasFlagged) return '⚠️'
    return '⚠️'
  }

  const getStatusText = () => {
    if (isAdequate) return 'Your dataset contains all required columns for this analysis.'
    if (hasMissing && hasFlagged) return 'Missing columns AND columns marked for removal detected.'
    if (hasMissing) return 'Some required columns are missing from your dataset.'
    if (hasFlagged) return 'Some required columns are marked for removal.'
    return 'Please review the requirements below.'
  }

  const getStatusColor = () => {
    if (isAdequate) return '#4ade80'
    return '#f87171'
  }

  return (
    <div style={{ ...glass, padding: '24px', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#f1f4fc', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>
            📋 Data Adequacy Check
          </h2>
          <p style={{ color: '#8b9bc4', fontSize: '13px', margin: 0 }}>
            {result.allAvailableColumns.length} columns available · {result.requiredColumns.length} columns required
          </p>
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          padding: '6px 16px',
          borderRadius: '20px',
          background: isAdequate ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
          color: getStatusColor(),
        }}>
          {getStatusIcon()} {isAdequate ? 'Adequate' : 'Needs Attention'}
        </div>
      </div>

      {/* Status message */}
      <div style={{
        marginTop: '12px',
        padding: '12px 16px',
        borderRadius: '10px',
        background: isAdequate ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
        border: `1px solid ${isAdequate ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
      }}>
        <p style={{ margin: 0, fontSize: '13px', color: getStatusColor(), lineHeight: 1.5 }}>
          {getStatusText()}
        </p>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.3)',
        }}>
          {result.warnings.map((warning, i) => (
            <p key={i} style={{ margin: i > 0 ? '4px 0 0 0' : 0, fontSize: '12px', color: '#fbbf24', lineHeight: 1.5 }}>
              ⚠️ {warning}
            </p>
          ))}
        </div>
      )}

      {/* Required Columns Table */}
      <div style={{ marginTop: '16px' }}>
        <h3 style={{ color: '#aab4d4', fontSize: '13px', fontWeight: 600, margin: '0 0 10px' }}>
          Required Columns for Your Research Question:
        </h3>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#8b9bc4', fontWeight: 600, fontSize: '11px' }}>Column</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#8b9bc4', fontWeight: 600, fontSize: '11px' }}>Reason</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#8b9bc4', fontWeight: 600, fontSize: '11px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.requiredColumns.map((col, i) => {
                const isMissing = result.missingColumns.includes(col.name)
                const isFlagged = result.flaggedColumns.some(fc => 
                  fc.toLowerCase().includes(col.name.toLowerCase()) || 
                  col.name.toLowerCase().includes(fc.toLowerCase())
                )
                const isFound = !isMissing && !isFlagged

                let status = '✅ Found'
                let statusColor = '#4ade80'
                if (isFlagged) {
                  status = '⚠️ Marked for removal'
                  statusColor = '#fbbf24'
                } else if (isMissing) {
                  status = '❌ Missing'
                  statusColor = '#f87171'
                }

                return (
                  <tr 
                    key={i} 
                    style={{ 
                      borderBottom: i < result.requiredColumns.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isMissing ? 'rgba(248,113,113,0.05)' : isFlagged ? 'rgba(251,191,36,0.05)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 14px', color: '#f1f4fc', fontWeight: 600 }}>
                      <code style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                        {col.name}
                      </code>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#aab4d4', fontSize: '12px' }}>{col.reason}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: statusColor, fontWeight: 600, fontSize: '12px' }}>
                      {status}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(96,165,250,0.06)',
          border: '1px solid rgba(96,165,250,0.2)',
        }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>💡 Suggestions:</p>
          {result.suggestions.map((suggestion, i) => (
            <p key={i} style={{ margin: i > 0 ? '4px 0 0 0' : 0, fontSize: '12px', color: '#cdd8ff', lineHeight: 1.5 }}>
              • {suggestion}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.03)',
            color: '#aab4d4',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          ← Back
        </button>

        <button
          onClick={onProceed}
          disabled={!isAdequate || isProcessing}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            background: isAdequate ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'rgba(255,255,255,0.06)',
            color: isAdequate ? '#fff' : '#6b7aa3',
            fontWeight: 700,
            fontSize: '14px',
            cursor: isAdequate ? 'pointer' : 'not-allowed',
            opacity: isAdequate && !isProcessing ? 1 : 0.5,
            marginLeft: 'auto',
          }}
        >
          {isProcessing ? 'Checking...' : isAdequate ? '✅ Proceed to Quality Check →' : 'Fix issues to proceed'}
        </button>
      </div>

      {/* Privacy note */}
      <div style={{
        marginTop: '16px',
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7aa3', textAlign: 'center' }}>
          🔒 All analysis runs locally in your browser. No data is sent to any server.
        </p>
      </div>
    </div>
  )
}
