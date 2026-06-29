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

  function downloadRScript() {
    const blob = new Blob([result.rScript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'analysis.R'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: result.execution.success ? '#f0fdf4' : '#fef2f2', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: result.execution.success ? '#166534' : '#991b1b' }}>
            {result.execution.success ? '✓ Analysis Complete' : '✗ R Execution Failed'}
          </span>
          <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
            {TEST_LABELS[result.plan.selectedTest] || result.plan.selectedTest} · {result.execution.executionTimeMs}ms
          </span>
        </div>
        <button
          onClick={downloadRScript}
          style={{ fontSize: '12px', background: '#fff', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
        >
          ↓ analysis.R
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        {[
          { key: 'plan', label: 'Plan' },
          { key: 'rscript', label: 'R Script' },
          { key: 'output', label: 'Raw R Output' },
          { key: 'interpretation', label: 'Interpretation' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              background: activeTab === tab.key ? '#fff' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab.key ? '#1e40af' : '#666',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {activeTab === 'plan' && (
          <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
            <p><strong>Research Question:</strong> {result.plan.researchQuestion}</p>
            <p style={{ marginTop: '8px' }}><strong>Test:</strong> {TEST_LABELS[result.plan.selectedTest] || result.plan.selectedTest}</p>
            <p style={{ marginTop: '8px' }}><strong>Hypothesis:</strong> {result.plan.hypothesis}</p>
            {result.plan.dependentVariable && <p style={{ marginTop: '8px' }}><strong>Dependent:</strong> {result.plan.dependentVariable}</p>}
            {result.plan.independentVariable && <p style={{ marginTop: '8px' }}><strong>Independent:</strong> {result.plan.independentVariable}</p>}
            <p style={{ marginTop: '8px' }}><strong>Rationale:</strong> {result.plan.testRationale}</p>
          </div>
        )}

        {activeTab === 'rscript' && (
          <pre style={{ background: '#1f2937', color: '#10b981', padding: '12px', borderRadius: '4px', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '500px' }}>
            {result.rScript}
          </pre>
        )}

        {activeTab === 'output' && (
          <pre style={{ background: '#1f2937', color: '#f3f4f6', padding: '12px', borderRadius: '4px', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '500px' }}>
            {result.execution.rawOutput || '(no output)'}
          </pre>
        )}

        {activeTab === 'interpretation' && (
          <pre style={{ fontSize: '14px', whiteSpace: 'pre-wrap', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.6, color: '#1f2937', maxHeight: '600px', overflowY: 'auto' }}>
            {result.aiInterpretation || 'No interpretation available.'}
          </pre>
        )}
      </div>
    </div>
  )
}
