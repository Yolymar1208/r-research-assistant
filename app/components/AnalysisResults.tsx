'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/app/types'
import { downloadReportAsPdf } from '@/app/lib/pdfReport'

interface Props {
  result: AnalysisResult
  datasetName?: string
  onReportDownload?: () => void
}

const TEST_LABELS: Record<string, string> = {
  descriptive_statistics: 'Descriptive Statistics',
  independent_t_test: 'Independent Samples t-test',
  paired_t_test: 'Paired t-test',
  one_way_anova: 'One-Way ANOVA',
  chi_square: 'Chi-Square Test',
  pearson_correlation: 'Pearson Correlation',
  mann_whitney: 'Mann-Whitney U Test',
  wilcoxon_signed_rank: 'Wilcoxon Signed-Rank Test',
  kruskal_wallis: 'Kruskal-Wallis Test',
  spearman_correlation: 'Spearman Rank Correlation',
  fishers_exact: "Fisher's Exact Test",
  mcnemar: "McNemar's Test",
  logistic_regression: 'Logistic Regression',
  linear_regression: 'Multiple Linear Regression',
  epidemic_curve: 'Epidemic Curve',
  attack_rate_table: 'Attack Rate Table',
  age_sex_pyramid: 'Age-Sex Pyramid',
  survival_analysis: 'Survival Analysis',
  moving_average: 'Moving Average (7-day)',
}

// Provenance: which tabs show content computed/verified by R vs written by AI.
// This drives color-coding so the distinction is visible at a glance, not just documented.
const TAB_SOURCE: Record<TabKey, 'r' | 'ai'> = {
  plan: 'ai',
  rscript: 'r',
  output: 'r',
  interpretation: 'ai',
}

import { getReferencesForTest, SOURCE_TAG_CONFIG, REFERENCE_TYPE_LABELS } from '@/app/lib/references'
import type { Reference } from '@/app/lib/references'

type TabKey = 'plan' | 'rscript' | 'output' | 'interpretation' | 'references'

const SOURCE_STYLES = {
  r: {
    activeBorder: 'border-emerald-600',
    activeText: 'text-emerald-700',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-800',
    dot: 'bg-emerald-500',
  },
  ai: {
    activeBorder: 'border-violet-600',
    activeText: 'text-violet-700',
    badgeBg: 'bg-violet-50',
    badgeBorder: 'border-violet-200',
    badgeText: 'text-violet-800',
    dot: 'bg-violet-500',
  },
} as const

function ProvenanceBadge({ source }: { source: 'r' | 'ai' }) {
  const s = SOURCE_STYLES[source]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${s.badgeBg} ${s.badgeBorder} ${s.badgeText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {source === 'r' ? 'Computed by R — verified' : 'Written by AI'}
    </span>
  )
}

export default function AnalysisResults({ result, datasetName = 'Dataset', onReportDownload }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(
    result.execution.success ? 'interpretation' : 'output'
  )
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState(false)
  const [interpretation, setInterpretation] = useState(result.aiInterpretation || '')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareError, setShareError] = useState(false)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'plan', label: 'Analysis Plan' },
    { key: 'rscript', label: 'R Script' },
    { key: 'output', label: 'Raw R Output' },
    { key: 'interpretation', label: 'AI Interpretation' },
    { key: 'references', label: '📚 References' },
  ]

  function downloadRScript() {
    const blob = new Blob([result.rScript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'analysis.R'
    a.click()
    URL.revokeObjectURL(url)
    onReportDownload?.()
  }

  async function downloadPDFReport() {
    setIsGeneratingPdf(true)
    setPdfError(false)
    try {
      await downloadReportAsPdf(result, result.plan.researchQuestion ? datasetName : 'Dataset')
      onReportDownload?.()
    } catch (err) {
      console.error('PDF download failed:', err)
      setPdfError(true)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  async function shareAnalysis() {
    if (shareUrl) {
      copyToClipboard(shareUrl)
      return
    }
    setIsSharing(true)
    setShareError(false)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, datasetName }),
      })
      const data = await res.json()
      if (data.success && data.shareUrl) {
        setShareUrl(data.shareUrl)
        copyToClipboard(data.shareUrl)
      } else {
        setShareError(true)
      }
    } catch {
      setShareError(true)
    } finally {
      setIsSharing(false)
    }
  }

  function copyToClipboard(text: string) {
    // Try modern clipboard API first, fall back to execCommand
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }).catch(() => {
        // Clipboard API failed — try fallback
        fallbackCopy(text)
      })
    } else {
      fallbackCopy(text)
    }
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    try {
      document.execCommand('copy')
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // Both methods failed — still show the link was created, not an error
      setShareCopied(false)
    } finally {
      document.body.removeChild(ta)
    }
  }

  // Render interpretation text with inline source tag badges
  function renderTaggedText(text: string): React.ReactNode {
    const tagPattern = /\[(R|WHO|CDC|EpiR|DOH|stat)\]/g
    const parts = text.split(tagPattern)
    return parts.map((part, i) => {
      const config = SOURCE_TAG_CONFIG[part]
      if (config) {
        return (
          <span key={i} title={config.label} style={{ display: 'inline-flex', alignItems: 'center', fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '6px', background: config.bg, color: config.color, border: `1px solid ${config.border}`, margin: '0 2px', verticalAlign: 'middle', lineHeight: 1.4 }}>
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  const references = getReferencesForTest(result.plan.selectedTest)

  const EPI_TESTS = ['epidemic_curve', 'attack_rate_table', 'age_sex_pyramid', 'survival_analysis', 'moving_average']
  const isEpiTest = EPI_TESTS.includes(result.plan.selectedTest)

  async function downloadQGISExport() {
    try {
      const res = await fetch('/api/generate-qgis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: result.plan,
          rawOutput: result.execution.rawOutput,
          datasetName: 'Dataset',
        }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `QGIS_${result.plan.selectedTest}_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('QGIS export failed:', err)
    }
  }

  const activeSource = TAB_SOURCE[activeTab]

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap`} style={{ background: result.execution.success ? 'rgba(220,252,231,0.95)' : 'rgba(254,226,226,0.95)', borderColor: result.execution.success ? 'rgba(134,239,172,0.5)' : 'rgba(252,165,165,0.5)' }}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`text-sm font-medium whitespace-nowrap ${result.execution.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.execution.success ? '✓ Analysis Complete' : '✗ R Execution Failed'}
          </span>
          <span className="text-xs text-gray-500 truncate">
            {TEST_LABELS[result.plan.selectedTest]} · {result.execution.executionTimeMs}ms
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadRScript} className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 font-medium whitespace-nowrap">↓ analysis.R</button>
          <button onClick={downloadPDFReport} disabled={isGeneratingPdf} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium whitespace-nowrap disabled:opacity-60">
            {isGeneratingPdf ? 'Preparing PDF…' : '↓ PDF Report'}
          </button>
          <button onClick={downloadQGISExport} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 font-medium whitespace-nowrap">↓ QGIS CSV</button>
          <button
            onClick={shareAnalysis}
            disabled={isSharing}
            className="text-xs px-3 py-1.5 rounded font-medium whitespace-nowrap disabled:opacity-60"
            style={shareUrl
              ? { background: '#7c5cff', color: '#fff' }
              : { background: 'rgba(124,92,255,0.1)', color: '#7c5cff', border: '1px solid rgba(124,92,255,0.4)' }}
          >
            {isSharing ? 'Creating link…' : shareCopied ? '✓ Link copied!' : shareUrl ? '🔗 Copy link' : '🔗 Share'}
          </button>
        </div>
      </div>
      {shareUrl && !shareCopied && (
        <div className="px-4 py-2 border-b text-xs flex items-center gap-2" style={{ background: 'rgba(124,92,255,0.06)', borderColor: 'rgba(124,92,255,0.2)', color: '#c4b5fd' }}>
          <span>🔗 Share link ready:</span>
          <span className="font-mono truncate flex-1" style={{ color: '#8fb4ff' }}>{shareUrl}</span>
          <button onClick={() => copyToClipboard(shareUrl)} className="flex-shrink-0 font-semibold" style={{ color: '#c4b5fd' }}>Copy</button>
        </div>
      )}
      {shareError && (
        <div className="px-4 py-2 border-b text-xs" style={{ background: 'rgba(254,242,242,0.97)', borderColor: 'rgba(252,165,165,0.5)', color: '#991b1b' }}>
          Could not create share link. Make sure you're logged in and try again.
        </div>
      )}
      {pdfError && (
        <div className="px-4 py-2 border-b text-xs" style={{ background: 'rgba(254,242,242,0.97)', borderColor: 'rgba(252,165,165,0.5)', color: '#991b1b' }}>
          Couldn't generate the PDF. Please try again — if it keeps failing, the R Script and Raw Output tabs always work as a backup.
        </div>
      )}

      {/* Provenance strip — the single most important trust signal in the app.
          Always visible, regardless of which tab is active. */}
      <div className="px-4 py-2 border-b flex items-center gap-x-4 gap-y-1 flex-wrap text-xs" style={{ background: 'rgba(232,239,250,0.95)', borderColor: 'rgba(180,200,230,0.5)', color: '#4a6080' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Statistics computed and verified by R
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Plan &amp; interpretation written by AI from R output
        </span>
      </div>

      <div className="flex border-b overflow-x-auto" style={{ background: 'rgba(228,236,248,0.95)', borderColor: 'rgba(180,200,230,0.5)' }}>
        {tabs.map((tab) => {
          const s = SOURCE_STYLES[TAB_SOURCE[tab.key]]
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                isActive ? `${s.activeBorder} ${s.activeText} bg-white` : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? s.dot : 'bg-gray-300'}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="p-4" style={{ background: 'rgba(240,244,250,0.97)' }}>
        <div className="mb-3">
          <ProvenanceBadge source={activeSource} />
        </div>

        {activeTab === 'plan' && (
          <div className="space-y-4">
            <div className="rounded p-3" style={{ background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)' }}>
              <p className="text-sm font-medium" style={{ color: '#5b21b6' }}>Research Question</p>
              <p className="text-sm mt-1" style={{ color: '#3b0764' }}>{result.plan.researchQuestion}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="font-medium" style={{ color: '#4a6080' }}>Statistical Test</p><p className="mt-0.5" style={{ color: '#1a2a3a' }}>{TEST_LABELS[result.plan.selectedTest]}</p></div>
              <div><p className="font-medium" style={{ color: '#4a6080' }}>Hypothesis</p><p className="mt-0.5" style={{ color: '#1a2a3a' }}>{result.plan.hypothesis}</p></div>
              {result.plan.dependentVariable && <div><p className="font-medium" style={{ color: '#4a6080' }}>Dependent Variable</p><p className="font-mono text-sm mt-0.5" style={{ color: '#1a2a3a' }}>{result.plan.dependentVariable}</p></div>}
              {result.plan.independentVariable && <div><p className="font-medium" style={{ color: '#4a6080' }}>Independent Variable</p><p className="font-mono text-sm mt-0.5" style={{ color: '#1a2a3a' }}>{result.plan.independentVariable}</p></div>}
            </div>
            <div><p className="font-medium text-sm" style={{ color: '#4a6080' }}>Rationale</p><p className="text-sm mt-1" style={{ color: '#1a2a3a' }}>{result.plan.testRationale}</p></div>
            <p className="text-xs italic" style={{ color: '#8098b8' }}>This plan was proposed by AI before any computation occurred. No statistical values appear above.</p>
          </div>
        )}

        {activeTab === 'rscript' && (
          <div>
            <p className="text-xs mb-2" style={{ color: '#4a6080' }}>
              Exact code executed on the R server. Download it above and re-run independently to verify any result.
            </p>
            <pre className="bg-gray-900 text-emerald-400 rounded p-4 text-xs overflow-x-auto leading-relaxed font-mono">
              {result.rScript}
            </pre>
          </div>
        )}

        {activeTab === 'output' && (
          <div>
            <p className="text-xs mb-2" style={{ color: '#4a6080' }}>
              Unmodified console output returned by R. Every number in the AI Interpretation tab is quoted from this output.
            </p>
            <pre className="bg-gray-900 text-gray-100 rounded p-4 text-xs overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
              {result.execution.rawOutput || '(no output)'}
            </pre>
          </div>
        )}

        {activeTab === 'interpretation' && (
          <div>
            <div className="rounded p-3 mb-4" style={{ background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)' }}>
              <p className="text-xs" style={{ color: '#5b21b6' }}>
                This interpretation was written by AI in plain language, based entirely on the verified R output in the Raw R Output tab. No statistical value below was estimated or generated by AI — every number is quoted directly from R.
              </p>
            </div>

            {interpretation ? (
              <div className="prose prose-sm max-w-none">
                {interpretation.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <h3 key={i} className="font-semibold mt-4 mb-1 first:mt-0" style={{ color: '#1a2a3a' }}>{line.replace(/\*\*/g, '')}</h3>
                  }
                  if (line.trim() === '') return <br key={i} />
                  return <p key={i} className="text-sm mb-1" style={{ color: '#2a3a4a' }}>{renderTaggedText(line.replace(/\*\*([^*]+)\*\*/g, '$1'))}</p>
                })}
              </div>
            ) : (
              <p className="text-sm italic" style={{ color: '#8098b8' }}>No interpretation available.</p>
            )}
          </div>
        )}
        {activeTab === 'references' && (
          <div>
            {/* Source tag legend */}
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(124,92,255,0.06)', border: '1px solid rgba(124,92,255,0.15)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#4a6080' }}>Source tag legend — inline badges in the AI Interpretation tab:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SOURCE_TAG_CONFIG).map(([tag, cfg]) => (
                  <div key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '8px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color }}>[{tag}]</span>
                    <span style={{ fontSize: '11px', color: '#4a6080' }}>{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reference list */}
            <div className="space-y-3">
              {references.map((ref: Reference) => (
                <div key={ref.id} className="p-3 rounded-lg" style={{ background: 'rgba(240,244,250,0.8)', border: '1px solid rgba(180,200,230,0.4)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(46,117,182,0.12)', color: '#1d4ed8', border: '1px solid rgba(46,117,182,0.2)' }}>
                          {REFERENCE_TYPE_LABELS[ref.type]}
                        </span>
                        {ref.downloadable && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)', color: '#166534', border: '1px solid rgba(74,222,128,0.2)' }}>
                            Free access
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold mb-0.5" style={{ color: '#1a2a3a' }}>{ref.title}</p>
                      <p className="text-xs mb-0.5" style={{ color: '#4a6080' }}>{ref.authors} ({ref.year}). {ref.source}.</p>
                      {ref.notes && <p className="text-xs italic" style={{ color: '#6b7aa3' }}>{ref.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold px-3 py-1.5 rounded whitespace-nowrap text-center"
                        style={{ background: 'rgba(46,117,182,0.1)', color: '#2e75b6', border: '1px solid rgba(46,117,182,0.3)', textDecoration: 'none' }}
                      >
                        Open →
                      </a>
                      {ref.downloadable && (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold px-3 py-1.5 rounded whitespace-nowrap text-center"
                          style={{ background: 'rgba(74,222,128,0.1)', color: '#166534', border: '1px solid rgba(74,222,128,0.2)', textDecoration: 'none' }}
                        >
                          ↓ Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs mt-4" style={{ color: '#8098b8', lineHeight: 1.6 }}>
              These references underpin the statistical methods and interpretive thresholds used in this analysis.
              All free-access documents can be downloaded directly. For paywalled textbooks, check your institutional library or DOI link.
              Source tags [R] [WHO] [CDC] [EpiR] [DOH] [stat] in the AI Interpretation tab identify which reference supports each specific claim.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
