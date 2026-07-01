'use client'

import type { AssumptionResult, CheckStatus } from '@/app/lib/assumptionChecker'
import type { AnalysisPlan } from '@/app/types'

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

const STATUS_CONFIG: Record<CheckStatus, { icon: string; color: string; bg: string; border: string }> = {
  pass: { icon: '✓', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  warn: { icon: '⚠', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  fail: { icon: '✗', color: '#991b1b', bg: '#fee2e2', border: '#fecaca' },
}

const OVERALL_CONFIG: Record<CheckStatus, { label: string; headerBg: string; headerBorder: string; headerText: string }> = {
  pass: { label: 'Ready to run', headerBg: '#dcfce7', headerBorder: '#bbf7d0', headerText: '#166534' },
  warn: { label: 'Proceed with awareness', headerBg: '#fef3c7', headerBorder: '#fde68a', headerText: '#92400e' },
  fail: { label: 'Issues detected', headerBg: '#fee2e2', headerBorder: '#fecaca', headerText: '#991b1b' },
}

interface Props {
  plan: AnalysisPlan
  result: AssumptionResult
  onProceed: () => void
  onBack: () => void
  isExecuting: boolean
}

export default function AssumptionPanel({ plan, result, onProceed, onBack, isExecuting }: Props) {
  const overall = OVERALL_CONFIG[result.overallStatus]

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: overall.headerBg, borderBottom: `1px solid ${overall.headerBorder}`, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: overall.headerText, margin: '0 0 2px' }}>
              Pre-flight Check · {overall.label}
            </p>
            <p style={{ fontSize: '12px', color: overall.headerText, opacity: 0.8, margin: 0 }}>
              {TEST_LABELS[plan.selectedTest]} · {result.summary}
            </p>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px',
            background: overall.headerBorder, color: overall.headerText, border: `1px solid ${overall.headerBorder}`,
          }}>
            {result.checks.filter(c => c.status === 'pass').length}/{result.checks.length} passed
          </span>
        </div>
      </div>

      {/* AI Plan summary */}
      <div style={{ padding: '12px 18px', background: '#eef4fb', borderBottom: '1px solid #dbeafe' }}>
        <p style={{ fontSize: '12px', color: '#1e40af', margin: '0 0 4px', fontWeight: 600 }}>AI selected test rationale</p>
        <p style={{ fontSize: '12px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>{plan.testRationale}</p>
        {plan.planSummary && <p style={{ fontSize: '12px', color: '#3b82f6', margin: '6px 0 0', lineHeight: 1.5 }}>{plan.planSummary}</p>}
      </div>

      {/* Checks list */}
      <div style={{ padding: '12px 18px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>
          Assumption Checks
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {result.checks.map((check, i) => {
            const s = STATUS_CONFIG[check.status]
            return (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: s.bg, border: `1px solid ${s.border}` }}>
                <span style={{ fontSize: '13px', color: s.color, fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>{s.icon}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: s.color, margin: '0 0 2px' }}>{check.label}</p>
                  <p style={{ fontSize: '12px', color: '#444', margin: 0, lineHeight: 1.5 }}>{check.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Advisory note */}
      <div style={{ padding: '0 18px 12px' }}>
        <p style={{ fontSize: '11px', color: '#999', margin: 0, lineHeight: 1.5 }}>
          These checks are advisory — you can always proceed. R will apply data fixes automatically and flag any remaining issues in its output. The Raw R Output tab will show all warnings from R after execution.
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: '#f8fafc' }}>
        <button
          onClick={onBack}
          disabled={isExecuting}
          style={{ padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', color: '#555' }}
        >
          ← Revise question
        </button>
        <button
          onClick={onProceed}
          disabled={isExecuting}
          style={{
            padding: '9px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
            cursor: isExecuting ? 'not-allowed' : 'pointer', border: 'none', color: '#fff',
            background: result.overallStatus === 'fail'
              ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
              : result.overallStatus === 'warn'
              ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
              : 'linear-gradient(135deg, #7c5cff 0%, #2e75b6 100%)',
            opacity: isExecuting ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          {isExecuting ? (
            <>
              <svg style={{ animation: 'spin 1s linear infinite', height: '14px', width: '14px' }} viewBox="0 0 24 24" fill="none">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Running R…
            </>
          ) : (
            result.overallStatus === 'fail' ? 'Run Anyway ⚠' : 'Run Analysis →'
          )}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
