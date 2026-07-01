'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/app/types'
import { downloadReportAsPdf } from '@/app/lib/pdfReport'

interface Props {
  result: AnalysisResult
  datasetName?: string
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

type TabKey = 'plan' | 'rscript' | 'output' | 'interpretation'

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

export default function AnalysisResults({ result, datasetName = 'Dataset' }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(
    result.execution.success ? 'interpretation' : 'output'
  )
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState(false)
  const [language, setLanguage] = useState<'english' | 'filipino'>('english')
  const [interpretation, setInterpretation] = useState(result.aiInterpretation || '')
  const [isReinterpreting, setIsReinterpreting] = useState(false)
  const [reinterpretError, setReinterpretError] = useState(false)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'plan', label: 'Analysis Plan' },
    { key: 'rscript', label: 'R Script' },
    { key: 'output', label: 'Raw R Output' },
    { key: 'interpretation', label: 'AI Interpretation' },
  ]

  function downloadRScript() {
    const blob = new Blob([result.rScript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'analysis.R'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadPDFReport() {
    setIsGeneratingPdf(true)
    setPdfError(false)
    try {
      await downloadReportAsPdf(result, result.plan.researchQuestion ? datasetName : 'Dataset')
    } catch (err) {
      console.error('PDF download failed:', err)
      setPdfError(true)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  async function switchLanguage(lang: 'english' | 'filipino') {
    if (lang === language) return
    setLanguage(lang)
    setIsReinterpreting(true)
    setReinterpretError(false)
    setActiveTab('interpretation')
    try {
      const res = await fetch('/api/reinterpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: result.plan,
          rScript: result.rScript,
          rawOutput: result.execution.rawOutput,
          language: lang,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setInterpretation(data.interpretation)
      } else {
        setReinterpretError(true)
        setLanguage(lang === 'english' ? 'filipino' : 'english')
      }
    } catch {
      setReinterpretError(true)
      setLanguage(lang === 'english' ? 'filipino' : 'english')
    } finally {
      setIsReinterpreting(false)
    }
  }

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
      <div className={`px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap ${result.execution.success ? 'bg-green-50' : 'bg-red-50'}`}>
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
          {isEpiTest && (
            <button onClick={downloadQGISExport} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 font-medium whitespace-nowrap">↓ QGIS CSV</button>
          )}
        </div>
      </div>
      {pdfError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          Couldn't generate the PDF. Please try again — if it keeps failing, the R Script and Raw Output tabs always work as a backup.
        </div>
      )}

      {/* Provenance strip — the single most important trust signal in the app.
          Always visible, regardless of which tab is active. */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Statistics computed and verified by R
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Plan &amp; interpretation written by AI from R output
        </span>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
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

      <div className="p-4">
        <div className="mb-3">
          <ProvenanceBadge source={activeSource} />
        </div>

        {activeTab === 'plan' && (
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-100 rounded p-3">
              <p className="text-sm font-medium text-violet-900">Research Question</p>
              <p className="text-sm text-violet-800 mt-1">{result.plan.researchQuestion}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="font-medium text-gray-700">Statistical Test</p><p className="text-gray-900 mt-0.5">{TEST_LABELS[result.plan.selectedTest]}</p></div>
              <div><p className="font-medium text-gray-700">Hypothesis</p><p className="text-gray-900 mt-0.5">{result.plan.hypothesis}</p></div>
              {result.plan.dependentVariable && <div><p className="font-medium text-gray-700">Dependent Variable</p><p className="font-mono text-sm text-gray-900 mt-0.5">{result.plan.dependentVariable}</p></div>}
              {result.plan.independentVariable && <div><p className="font-medium text-gray-700">Independent Variable</p><p className="font-mono text-sm text-gray-900 mt-0.5">{result.plan.independentVariable}</p></div>}
            </div>
            <div><p className="font-medium text-gray-700 text-sm">Rationale</p><p className="text-sm text-gray-700 mt-1">{result.plan.testRationale}</p></div>
            <p className="text-xs text-gray-400 italic">This plan was proposed by AI before any computation occurred. No statistical values appear above.</p>
          </div>
        )}

        {activeTab === 'rscript' && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              Exact code executed on the R server. Download it above and re-run independently to verify any result.
            </p>
            <pre className="bg-gray-900 text-emerald-400 rounded p-4 text-xs overflow-x-auto leading-relaxed font-mono">
              {result.rScript}
            </pre>
          </div>
        )}

        {activeTab === 'output' && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              Unmodified console output returned by R. Every number in the AI Interpretation tab is quoted from this output.
            </p>
            <pre className="bg-gray-900 text-gray-100 rounded p-4 text-xs overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
              {result.execution.rawOutput || '(no output)'}
            </pre>
          </div>
        )}

        {activeTab === 'interpretation' && (
          <div>
            {/* Language toggle */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 p-1 rounded-lg" style={{ background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)' }}>
                {(['english', 'filipino'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => switchLanguage(lang)}
                    disabled={isReinterpreting}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all disabled:opacity-50"
                    style={language === lang
                      ? { background: 'linear-gradient(135deg, #7c5cff 0%, #2e75b6 100%)', color: '#fff' }
                      : { color: '#8b9bc4', background: 'transparent' }}
                  >
                    {lang === 'english' ? '🇺🇸 English' : '🇵🇭 Filipino'}
                  </button>
                ))}
              </div>
              {isReinterpreting && (
                <span className="text-xs text-violet-400 flex items-center gap-1.5">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  Translating interpretation…
                </span>
              )}
            </div>

            {reinterpretError && (
              <div className="text-xs text-red-400 mb-3 p-2 rounded" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
                Could not generate translation. Please try again.
              </div>
            )}

            <div className="bg-violet-50 border border-violet-100 rounded p-3 mb-4">
              <p className="text-xs text-violet-900">
                {language === 'filipino'
                  ? 'Ang interpretasyong ito ay isinulat ng AI batay sa napatunayan na R output sa ibaba. Lahat ng numero ay direktang kinopya mula sa R — hindi tinantya ng AI.'
                  : 'This interpretation was written by AI in plain language, based entirely on the verified R output in the Raw R Output tab. No statistical value below was estimated or generated by AI — every number is quoted directly from R.'}
              </p>
            </div>

            {isReinterpreting ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 rounded animate-pulse" style={{ background: 'rgba(124,92,255,0.1)', width: `${70 + Math.random() * 30}%` }} />
                ))}
              </div>
            ) : interpretation ? (
              <div className="prose prose-sm max-w-none text-gray-800">
                {interpretation.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <h3 key={i} className="font-semibold text-gray-900 mt-4 mb-1 first:mt-0">{line.replace(/\*\*/g, '')}</h3>
                  }
                  if (line.trim() === '') return <br key={i} />
                  return <p key={i} className="text-sm text-gray-700 mb-1">{line.replace(/\*\*([^*]+)\*\*/g, '$1')}</p>
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No interpretation available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
