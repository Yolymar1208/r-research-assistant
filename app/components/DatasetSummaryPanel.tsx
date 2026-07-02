'use client'

import type { DatasetSummary } from '@/app/types'

type SummaryWithWarnings = DatasetSummary & { warnings?: string[] }

interface Props {
  summary: SummaryWithWarnings
}

const BG = {
  panel:    'rgba(240,244,250,0.97)',
  header:   'rgba(228,236,248,0.95)',
  rowEven:  'rgba(240,244,250,0.97)',
  rowOdd:   'rgba(232,239,250,0.95)',
  border:   'rgba(180,200,230,0.5)',
  text:     '#1a2a3a',
  subtext:  '#4a6080',
  muted:    '#8098b8',
}

const TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  numeric:   { bg: 'rgba(96,165,250,0.15)',  text: '#1d4ed8' },
  integer:   { bg: 'rgba(124,92,255,0.15)',  text: '#5b21b6' },
  character: { bg: 'rgba(34,197,94,0.15)',   text: '#166534' },
  logical:   { bg: 'rgba(168,85,247,0.15)',  text: '#7e22ce' },
  date:      { bg: 'rgba(251,146,60,0.15)',  text: '#9a3412' },
  unknown:   { bg: 'rgba(148,163,184,0.15)', text: '#475569' },
}

export default function DatasetSummaryPanel({ summary }: Props) {
  const warnings = summary.warnings ?? []

  return (
    <div style={{ border: `1px solid ${BG.border}`, borderRadius: '8px', overflow: 'hidden', background: BG.panel }}>
      <div style={{ background: BG.header, padding: '10px 16px', borderBottom: `1px solid ${BG.border}` }}>
        <p style={{ fontWeight: 700, color: BG.text, fontSize: '13px', margin: '0 0 4px' }}>Dataset Summary</p>
        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: BG.subtext }}>
          <span><strong style={{ color: BG.text }}>{summary.rowCount.toLocaleString()}</strong> rows</span>
          <span><strong style={{ color: BG.text }}>{summary.columnCount}</strong> columns</span>
          <span style={{ color: BG.muted }}>{summary.fileName}</span>
        </div>
      </div>

      {warnings.length > 0 && (
        <div style={{ background: 'rgba(254,243,199,0.95)', borderBottom: `1px solid rgba(253,230,138,0.6)`, padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#d97706', marginTop: '1px', flexShrink: 0 }}>⚠</span>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>
                {warnings.length === 1 ? 'Data quality note' : `${warnings.length} data quality notes`}
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {warnings.map((w, i) => (
                  <li key={i} style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.5, marginBottom: '2px' }}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: BG.header }}>
              {['Column', 'R Name', 'Type', 'Missing', 'Unique', 'Sample Values'].map((h, i) => (
                <th key={h} style={{ padding: '8px 14px', fontWeight: 600, color: BG.subtext, textAlign: i >= 3 && i <= 4 ? 'right' : 'left', borderBottom: `1px solid ${BG.border}`, whiteSpace: 'nowrap', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.columns.map((col, i) => {
              const badge = TYPE_BADGES[col.detectedType] || TYPE_BADGES.unknown
              const isMissing = col.missingCount > 0
              const isHighMissing = col.missingPercent >= 50
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? BG.rowEven : BG.rowOdd, borderBottom: `1px solid ${BG.border}` }}>
                  <td style={{ padding: '7px 14px', fontWeight: 600, color: BG.text, whiteSpace: 'nowrap' }}>{col.name}</td>
                  <td style={{ padding: '7px 14px', fontFamily: 'monospace', fontSize: '11px', color: BG.muted, whiteSpace: 'nowrap' }}>{col.cleanName}</td>
                  <td style={{ padding: '7px 14px' }}>
                    <span style={{ background: badge.bg, color: badge.text, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
                      {col.detectedType}
                    </span>
                  </td>
                  <td style={{ padding: '7px 14px', textAlign: 'right', color: isHighMissing ? '#dc2626' : isMissing ? '#d97706' : BG.muted, fontWeight: isMissing ? 600 : 400 }}>
                    {col.missingCount > 0 ? `${col.missingCount} (${col.missingPercent}%)` : <span style={{ color: BG.muted }}>0</span>}
                  </td>
                  <td style={{ padding: '7px 14px', textAlign: 'right', color: BG.subtext }}>{col.uniqueCount}</td>
                  <td style={{ padding: '7px 14px', color: BG.muted, fontSize: '11px' }}>
                    {col.sample.filter(v => v !== null).slice(0, 3).map(String).join(', ')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {summary.preview.length > 0 && (
        <details style={{ borderTop: `1px solid ${BG.border}` }}>
          <summary style={{ padding: '8px 16px', background: BG.header, fontSize: '12px', color: BG.subtext, cursor: 'pointer', userSelect: 'none' }}>
            ▸ Preview (first {summary.preview.length} rows)
          </summary>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: BG.header, borderBottom: `1px solid ${BG.border}` }}>
                  {Object.keys(summary.preview[0]).map(key => (
                    <th key={key} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: BG.subtext, whiteSpace: 'nowrap' }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.preview.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? BG.rowEven : BG.rowOdd }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ padding: '5px 12px', color: val === null ? BG.muted : BG.text, whiteSpace: 'nowrap' }}>
                        {val === null ? '—' : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
