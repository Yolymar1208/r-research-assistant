'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/app/types'

interface Props {
  result: AnalysisResult
}

const TEST_LABELS: Record<string, string> = {
  // Parametric
  descriptive_statistics: 'Descriptive Statistics',
  independent_t_test: 'Independent Samples t-test',
  paired_t_test: 'Paired t-test',
  one_way_anova: 'One-Way ANOVA',
  chi_square: 'Chi-Square Test',
  pearson_correlation: 'Pearson Correlation',
  // Non-parametric
  mann_whitney: 'Mann-Whitney U Test',
  wilcoxon_signed_rank: 'Wilcoxon Signed-Rank Test',
  kruskal_wallis: 'Kruskal-Wallis Test',
  spearman_correlation: 'Spearman Rank Correlation',
  fishers_exact: "Fisher's Exact Test",
  mcnemar: "McNemar's Test",
  // Regression
  logistic_regression: 'Logistic Regression',
  linear_regression: 'Multiple Linear Regression',
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
      // Open in new window and trigger print dialog (save as PDF)
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

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Status bar */}
      <div
        className={`px-4 py-3 border-b border-gray-200 flex items-center justify-between ${
          result.execution.success ? 'bg-green-50' : 'bg-red-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${result.execution.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.execution.success ? '✓ Analysis Complete' : '✗ R Execution Failed'}
          </span>
          <span className="text-xs text-gray-500">
            {TEST_LABELS[result.plan.selectedTest]} · {result.execution.executionTimeMs}ms
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadRScript}
            className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 font-medium"
          >
            ↓ analysis.R
          </button>
          <button
            onClick={downloadPDFReport}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium"
          >
            ↓ PDF Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {/* Analysis Plan */}
        {activeTab === 'plan' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded p-3">
              <p className="text-sm font-medium text-blue-900">Research Question</p>
              <p className="text-sm text-blue-800 mt-1">{result.plan.researchQuestion}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-medium text-gray-700">Statistical Test</p>
                <p className="text-gray-900 mt-0.5">{TEST_LABELS[result.plan.selectedTest]}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Hypothesis</p>
                <p className="text-gray-900 mt-0.5">{result.plan.hypothesis}</p>
              </div>
              {result.plan.dependentVariable && (
                <div>
                  <p className="font-medium text-gray-700">Dependent Variable</p>
                  <p className="font-mono text-sm text-gray-900 mt-0.5">{result.plan.dependentVariable}</p>
                </div>
              )}
              {result.plan.independentVariable && (
                <div>
                  <p className="font-medium text-gray-700">Independent Variable</p>
                  <p className="font-mono text-sm text-gray-900 mt-0.5">{result.plan.independentVariable}</p>
                </div>
              )}
            </div>

            <div>
              <p className="font-medium text-gray-700 text-sm">Rationale</p>
              <p className="text-sm text-gray-700 mt-1">{result.plan.testRationale}</p>
            </div>

            {result.plan.assumptions.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 text-sm">Assumptions to Check</p>
                <ul className="mt-1 space-y-1">
                  {result.plan.assumptions.map((a, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.plan.followUpQuestions.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-sm font-medium text-amber-800">
                  AI needs clarification on the following:
                </p>
                <ul className="mt-1 space-y-1">
                  {result.plan.followUpQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-amber-700 flex gap-2">
                      <span className="mt-0.5">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* R Script */}
        {activeTab === 'rscript' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-500">Generated by AI · Executed by R</p>
              <button
                onClick={downloadRScript}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Download analysis.R
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 rounded p-4 text-xs overflow-x-auto leading-relaxed font-mono">
              {result.rScript}
            </pre>
          </div>
        )}

        {/* Raw R Output */}
        {activeTab === 'output' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  result.execution.success
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {result.execution.success ? 'Success' : 'Error'}
              </span>
              <span className="text-xs text-gray-500">
                Execution time: {result.execution.executionTimeMs}ms
              </span>
            </div>

            {result.execution.errorMessage && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-xs font-medium text-red-700 mb-1">R Error:</p>
                <pre className="text-xs text-red-800 overflow-x-auto whitespace-pre-wrap">
                  {result.execution.errorMessage}
                </pre>
              </div>
            )}

            <pre className="bg-gray-900 text-gray-100 rounded p-4 text-xs overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
              {result.execution.rawOutput || '(no output)'}
            </pre>
          </div>
        )}

        {/* AI Interpretation */}
        {activeTab === 'interpretation' && (
          <div>
            {result.aiInterpretation ? (
              <div className="prose prose-sm max-w-none text-gray-800">
                {result.aiInterpretation.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <h3 key={i} className="font-semibold text-gray-900 mt-4 mb-1 first:mt-0">
                        {line.replace(/\*\*/g, '')}
                      </h3>
                    )
                  }
                  if (line.trim() === '') return <br key={i} />
                  return (
                    <p key={i} className="text-sm text-gray-700 mb-1">
                      {line.replace(/\*\*([^*]+)\*\*/g, '$1')}
                    </p>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No interpretation available. Check the Raw R Output tab.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
