import { NextRequest, NextResponse } from 'next/server'
import type { AnalysisResult } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatInterpretation(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      if (line.startsWith('**') && line.includes('**')) {
        const heading = line.replace(/\*\*/g, '')
        return `<h3 class="section-heading">${escapeHtml(heading)}</h3>`
      }
      if (line.trim() === '') return '<br>'
      return `<p>${escapeHtml(line)}</p>`
    })
    .join('\n')
}

function generateReportHTML(result: AnalysisResult, datasetName: string): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  const timeStr = now.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit'
  })

  const testLabel = TEST_LABELS[result.plan.selectedTest] || result.plan.selectedTest
  const assumptions = result.plan.assumptions.map((a) => `<li>${escapeHtml(a)}</li>`).join('')
  const interpretationHTML = formatInterpretation(result.aiInterpretation)
  const rScriptEscaped = escapeHtml(result.rScript)
  const rawOutputEscaped = escapeHtml(result.execution.rawOutput)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statistical Analysis Report — JOANResearchOS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
    }
    .page { max-width: 210mm; margin: 0 auto; padding: 20mm 22mm; }
    .report-header { border-bottom: 3px solid #1a3a5c; padding-bottom: 16px; margin-bottom: 24px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .institution { font-size: 9pt; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
    .report-type { font-size: 9pt; color: #1a3a5c; font-weight: bold; text-align: right; text-transform: uppercase; letter-spacing: 0.5px; }
    .report-title { font-size: 18pt; font-weight: bold; color: #1a3a5c; margin-top: 12px; line-height: 1.3; }
    .report-subtitle { font-size: 11pt; color: #444; margin-top: 4px; }
    .meta-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;
      background: #f0f4f8; border: 1px solid #ccd6e0; border-radius: 6px;
      padding: 14px 18px; margin-bottom: 28px; font-size: 9.5pt;
    }
    .meta-item { display: flex; gap: 8px; }
    .meta-label { color: #555; min-width: 110px; font-style: italic; }
    .meta-value { color: #1a1a1a; font-weight: bold; }
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    .section-title {
      font-size: 13pt; font-weight: bold; color: #1a3a5c;
      border-left: 4px solid #1a3a5c; padding-left: 10px;
      margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .section-heading { font-size: 11pt; font-weight: bold; color: #1a3a5c; margin: 14px 0 6px; }
    p { margin-bottom: 8px; }
    .rq-box {
      background: #eef4fb; border-left: 4px solid #2e75b6;
      border-radius: 0 6px 6px 0; padding: 14px 16px; margin-bottom: 12px;
      font-style: italic; font-size: 11pt; color: #1a3a5c;
    }
    .hypothesis-box {
      background: #f8f8f8; border: 1px solid #ddd;
      border-radius: 6px; padding: 12px 16px; font-size: 10pt; color: #333;
    }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 12px; }
    th { background: #1a3a5c; color: #fff; padding: 8px 12px; text-align: left; font-size: 9.5pt; }
    td { padding: 7px 12px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8f9fb; }
    .assumptions-list { list-style: none; padding: 0; }
    .assumptions-list li { padding: 5px 0 5px 20px; position: relative; border-bottom: 1px solid #eee; font-size: 10pt; }
    .assumptions-list li:before { content: "✓"; position: absolute; left: 0; color: #2e75b6; font-weight: bold; }
    .code-block {
      background: #1a1a2e; color: #e0e0e0; font-family: 'Courier New', monospace;
      font-size: 8.5pt; padding: 16px; border-radius: 6px;
      white-space: pre-wrap; word-break: break-all; line-height: 1.5; page-break-inside: avoid;
    }
    .r-script-block {
      background: #0d1117; color: #58a6ff; font-family: 'Courier New', monospace;
      font-size: 8.5pt; padding: 16px; border-radius: 6px;
      white-space: pre-wrap; word-break: break-all; line-height: 1.5; page-break-inside: avoid;
    }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 9pt; font-weight: bold; margin-bottom: 10px; }
    .status-success { background: #d4edda; color: #155724; }
    .status-error { background: #f8d7da; color: #721c24; }
    .exec-stats { display: flex; gap: 20px; font-size: 9pt; color: #666; margin-bottom: 12px; }
    .exec-stat { display: flex; gap: 6px; }
    .exec-stat-label { color: #999; }
    .exec-stat-value { font-weight: bold; color: #333; }
    .disclaimer {
      background: #fffbe6; border: 1px solid #ffe58f; border-radius: 6px;
      padding: 10px 14px; font-size: 9pt; color: #7a5c00; margin-bottom: 20px;
    }
    .report-footer {
      margin-top: 40px; padding-top: 16px; border-top: 2px solid #1a3a5c;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8.5pt; color: #777;
    }
    .footer-brand { font-weight: bold; color: #1a3a5c; }
    @media print {
      .page { padding: 15mm 18mm; }
      .section { page-break-inside: avoid; }
      .code-block, .r-script-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="report-header">
    <div class="header-top">
      <div class="institution">JOANResearchOS · Statistical Analysis Platform</div>
      <div class="report-type">Analysis Report</div>
    </div>
    <div class="report-title">Statistical Analysis Report</div>
    <div class="report-subtitle">${escapeHtml(testLabel)} · ${escapeHtml(datasetName)}</div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><span class="meta-label">Date Generated:</span><span class="meta-value">${dateStr}</span></div>
    <div class="meta-item"><span class="meta-label">Time:</span><span class="meta-value">${timeStr}</span></div>
    <div class="meta-item"><span class="meta-label">Statistical Test:</span><span class="meta-value">${escapeHtml(testLabel)}</span></div>
    <div class="meta-item"><span class="meta-label">Dataset:</span><span class="meta-value">${escapeHtml(datasetName)}</span></div>
    <div class="meta-item"><span class="meta-label">Dependent Variable:</span><span class="meta-value">${escapeHtml(result.plan.dependentVariable || 'N/A')}</span></div>
    <div class="meta-item"><span class="meta-label">Independent Variable:</span><span class="meta-value">${escapeHtml(result.plan.independentVariable || 'N/A')}</span></div>
    <div class="meta-item"><span class="meta-label">Statistical Engine:</span><span class="meta-value">R (all calculations)</span></div>
    <div class="meta-item"><span class="meta-label">AI Assistant:</span><span class="meta-value">Claude by Anthropic</span></div>
  </div>

  <div class="disclaimer">
    ⚠ <strong>Transparency Notice:</strong> All statistical values in this report were computed exclusively by R.
    The AI assistant generated the R code and interpreted the output — it did not compute or estimate any statistical values.
    The complete R script and raw output are included for full reproducibility.
  </div>

  <div class="section">
    <div class="section-title">1. Research Question &amp; Hypothesis</div>
    <div class="rq-box">${escapeHtml(result.plan.researchQuestion)}</div>
    <div class="hypothesis-box">
      <strong>Null Hypothesis (H₀):</strong> ${escapeHtml(result.plan.hypothesis)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. Analysis Plan</div>
    <p>${escapeHtml(result.plan.planSummary || '')}</p>
    ${result.plan.testRationale ? `<p><strong>Test rationale:</strong> ${escapeHtml(result.plan.testRationale)}</p><br>` : ''}
    <table>
      <tr><th>Parameter</th><th>Value</th></tr>
      <tr><td>Statistical Test</td><td>${escapeHtml(testLabel)}</td></tr>
      <tr><td>Dependent Variable</td><td>${escapeHtml(result.plan.dependentVariable || 'N/A')}</td></tr>
      <tr><td>Independent Variable</td><td>${escapeHtml(result.plan.independentVariable || 'N/A')}</td></tr>
      ${result.plan.additionalVariables?.length > 0 ? `<tr><td>Additional Variables</td><td>${escapeHtml(result.plan.additionalVariables.join(', '))}</td></tr>` : ''}
      <tr><td>R Execution Time</td><td>${result.execution.executionTimeMs}ms</td></tr>
      <tr><td>Execution Status</td><td>${result.execution.success ? '✓ Successful' : '✗ Failed'}</td></tr>
    </table>
    ${assumptions ? `<strong>Statistical Assumptions:</strong><ul class="assumptions-list">${assumptions}</ul>` : ''}
  </div>

  <div class="section">
    <div class="section-title">3. Results &amp; Interpretation</div>
    <div class="status-badge ${result.execution.success ? 'status-success' : 'status-error'}">
      ${result.execution.success ? '✓ R Executed Successfully' : '✗ R Execution Failed'}
    </div>
    <div class="exec-stats">
      <div class="exec-stat"><span class="exec-stat-label">Execution time:</span><span class="exec-stat-value">${result.execution.executionTimeMs}ms</span></div>
      <div class="exec-stat"><span class="exec-stat-label">Completed:</span><span class="exec-stat-value">${new Date(result.completedAt).toLocaleString('en-PH')}</span></div>
    </div>
    ${interpretationHTML}
  </div>

  <div class="section">
    <div class="section-title">4. Raw R Output</div>
    <p style="font-size:9.5pt;color:#555;margin-bottom:10px;">
      Verbatim console output from R. All statistical values originate from this output.
    </p>
    <div class="code-block">${rawOutputEscaped}</div>
  </div>

  <div class="section">
    <div class="section-title">5. R Script (Reproducible Code)</div>
    <p style="font-size:9.5pt;color:#555;margin-bottom:10px;">
      Generated by AI, executed by R. Copy this script to reproduce the analysis independently.
    </p>
    <div class="r-script-block">${rScriptEscaped}</div>
  </div>

  <div class="report-footer">
    <div>
      <div class="footer-brand">JOANResearchOS</div>
      <div>Statistical Engine: R · AI: Claude by Anthropic</div>
    </div>
    <div style="text-align:right;">
      <div>Generated: ${dateStr} ${timeStr}</div>
      <div>All calculations by R · AI interprets only</div>
    </div>
  </div>

</div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { result, datasetName } = body as { result: AnalysisResult; datasetName: string }

    if (!result) {
      return NextResponse.json({ success: false, error: 'Analysis result is required.' }, { status: 400 })
    }

    const html = generateReportHTML(result, datasetName || 'Unknown Dataset')

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Report generation failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
