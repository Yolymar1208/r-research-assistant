'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/app/types'

interface Props {
  result: AnalysisResult
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

export default function AnalysisResults({ result }: Props) {
  const [activeTab, setActiveTab] = useState<'plan' | 'rscript' | 'output' | 'interpretation'>(
    result.execution.success ? 'interpretation' : 'output'
  )

  const tabs = [
    { key: 'plan' as const, label: 'Analysis Plan' },
    { key: 'rscript' as const, label: 'R Script' },
    { key: 'output' as const, label: 'Raw R Output' },
    { key: 'interpretation' as const, label: 'AI Interpretation' },
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
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, datasetName: 'Dataset' }),
      })
      const html = await res.text()
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        win.focus()
        setTimeout(() => win.print(), 800)
      }
    } catch (err) {
      console.error('Report generation failed:', err)
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

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className={`px-4 py-3 border-b border-gray-200 flex items-center justify-between ${result.execution.success ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${result.execution.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.execution.success ? '✓ Analysis Complete' : '✗ R Execution Failed'}
          </span>
          <span className="text-xs text-gray-500">
            {TEST_LABELS[result.plan.selectedTest]} · {result.execution.executionTimeMs}ms
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadRScript} className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 font-medium">↓ analysis.R</button>
          <button onClick={downloadPDFReport} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium">↓ PDF Report</button>
          {isEpiTest && (
            <button onClick={downloadQGISExport} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 font-medium">↓ QGIS CSV</button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === 'plan' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded p-3">
              <p className="text-sm font-medium text-blue-900">Research Question</p>
              <p className="text-sm text-blue-800 mt-1">{result.plan.researchQuestion}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="font-medium text-gray-700">Statistical Test</p><p className="text-gray-900 mt-0.5">{TEST_LABELS[result.plan.selectedTest]}</p></div>
              <div><p className="font-medium text-gray-700">Hypothesis</p><p className="text-gray-900 mt-0.5">{result.plan.hypothesis}</p></div>
              {result.plan.dependentVariable && <div><p className="font-medium text-gray-700">Dependent Variable</p><p className="font-mono text-sm text-gray-900 mt-0.5">{result.plan.dependentVariable}</p></div>}
              {result.plan.independentVariable && <div><p className="font-medium text-gray-700">Independent Variable</p><p className="font-mono text-sm text-gray-900 mt-0.5">{result.plan.independentVariable}</p></div>}
            </div>
            <div><p className="font-medium text-gray-700 text-sm">Rationale</p><p className="text-sm text-gray-700 mt-1">{result.plan.testRationale}</p></div>
          </div>
        )}

        {activeTab === 'rscript' && (
          <pre className="bg-gray-900 text-green-400 rounded p-4 text-xs overflow-x-auto leading-relaxed font-mono">
            {result.rScript}
          </pre>
        )}

        {activeTab === 'output' && (
          <pre className="bg-gray-900 text-gray-100 rounded p-4 text-xs overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
            {result.execution.rawOutput || '(no output)'}
          </pre>
        )}

        {activeTab === 'interpretation' && (
          <div>
            {result.aiInterpretation ? (
              <div className="prose prose-sm max-w-none text-gray-800">
                {result.aiInterpretation.split('\n').map((line, i) => {
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
