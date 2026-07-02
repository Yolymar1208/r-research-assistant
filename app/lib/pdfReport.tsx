// Client-side only — never import this in a server component or API route.
// Generates a true vector PDF with selectable text using @react-pdf/renderer.
// No browser binary needed, works on Vercel Hobby tier.

import React from 'react'
import type { AnalysisResult, AnalysisPlan } from '@/app/types'

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

// Parse AI interpretation markdown into structured sections.
// Bold-wrapped lines (**heading**) become section headers.
function parseInterpretation(text: string): { type: 'heading' | 'body'; text: string }[] {
  return text.split('\n').map((line) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return { type: 'heading' as const, text: line.replace(/\*\*/g, '') }
    }
    return { type: 'body' as const, text: line.replace(/\*\*([^*]+)\*\*/g, '$1') }
  })
}

// Full client-side PDF generation and download.
// Dynamically imports @react-pdf/renderer so it never ends up in the SSR bundle.
export async function downloadReportAsPdf(
  result: AnalysisResult,
  datasetName: string
): Promise<void> {
  const {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    pdf,
    Font,
  } = await import('@react-pdf/renderer')

  // Register a monospace font for code blocks. Falls back to Courier if
  // the CDN is unavailable — @react-pdf has Courier built-in.
  try {
    Font.register({
      family: 'RobotoMono',
      src: 'https://fonts.gstatic.com/s/robotomono/v23/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_S-W4Ep0.woff2',
    })
  } catch {
    // Falls back to Courier in styles below
  }

  const colors = {
    navy: '#1a3a5c',
    blue: '#2e75b6',
    lightBlue: '#eef4fb',
    green: '#166534',
    lightGreen: '#d4edda',
    red: '#721c24',
    lightRed: '#f8d7da',
    gray: '#555555',
    lightGray: '#f8f9fb',
    border: '#e0e0e0',
    warning: '#7a5c00',
    warningBg: '#fffbe6',
    warningBorder: '#ffe58f',
    white: '#ffffff',
    black: '#1a1a1a',
    codeText: '#58a6ff',
    codeBg: '#0d1117',
    outputText: '#e0e0e0',
    outputBg: '#1a1a2e',
  }

  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 10, color: colors.black, padding: '20mm 22mm', lineHeight: 1.5 },
    // Header
    header: { borderBottomWidth: 3, borderBottomColor: colors.navy, paddingBottom: 12, marginBottom: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    institution: { fontSize: 8, color: colors.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
    reportType: { fontSize: 8, color: colors.navy, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    reportTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: colors.navy, marginBottom: 4 },
    reportSubtitle: { fontSize: 10, color: colors.gray },
    // Meta grid
    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#f0f4f8', borderWidth: 1, borderColor: '#ccd6e0', borderRadius: 4, padding: 12, marginBottom: 20 },
    metaItem: { width: '50%', flexDirection: 'row', marginBottom: 4 },
    metaLabel: { fontSize: 8.5, color: colors.gray, fontFamily: 'Helvetica-Oblique', width: 100 },
    metaValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: colors.black, flex: 1 },
    // Disclaimer
    disclaimer: { backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 4, padding: '8 12', marginBottom: 18 },
    disclaimerText: { fontSize: 8.5, color: colors.warning },
    // Sections
    section: { marginBottom: 22 },
    sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: colors.navy, borderLeftWidth: 4, borderLeftColor: colors.navy, paddingLeft: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
    sectionHeading: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.navy, marginTop: 10, marginBottom: 4 },
    bodyText: { fontSize: 9.5, color: colors.black, marginBottom: 6, lineHeight: 1.5 },
    // RQ box
    rqBox: { backgroundColor: colors.lightBlue, borderLeftWidth: 4, borderLeftColor: colors.blue, borderRadius: 2, padding: '10 12', marginBottom: 10 },
    rqText: { fontSize: 10, fontFamily: 'Helvetica-Oblique', color: colors.navy },
    hypothesisBox: { backgroundColor: colors.lightGray, borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: '8 12' },
    hypothesisText: { fontSize: 9.5, color: '#333' },
    // Table
    table: { marginBottom: 10 },
    tableHeader: { flexDirection: 'row', backgroundColor: colors.navy },
    tableHeaderCell: { flex: 1, padding: '6 8', fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: colors.white },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
    tableRowEven: { backgroundColor: colors.lightGray },
    tableCell: { flex: 1, padding: '5 8', fontSize: 9, color: colors.black },
    // Assumptions
    assumptionItem: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#eee' },
    assumptionCheck: { fontSize: 9, color: colors.blue, fontFamily: 'Helvetica-Bold', width: 14 },
    assumptionText: { fontSize: 9, color: colors.black, flex: 1 },
    // Status
    statusBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, marginBottom: 8 },
    statusSuccess: { backgroundColor: colors.lightGreen },
    statusError: { backgroundColor: colors.lightRed },
    statusText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    statusTextSuccess: { color: colors.green },
    statusTextError: { color: colors.red },
    execStats: { flexDirection: 'row', marginBottom: 10 },
    execStat: { flexDirection: 'row', marginRight: 16 },
    execStatLabel: { fontSize: 8, color: '#999' },
    execStatValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#333' },
    // Code blocks
    codeBlock: { backgroundColor: colors.outputBg, borderRadius: 4, padding: 10, marginBottom: 8 },
    codeText: { fontFamily: 'Courier', fontSize: 7.5, color: colors.outputText, lineHeight: 1.4 },
    scriptBlock: { backgroundColor: colors.codeBg, borderRadius: 4, padding: 10, marginBottom: 8 },
    scriptText: { fontFamily: 'Courier', fontSize: 7.5, color: colors.codeText, lineHeight: 1.4 },
    // Footer
    footer: { position: 'absolute', bottom: '15mm', left: '22mm', right: '22mm', borderTopWidth: 2, borderTopColor: colors.navy, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
    footerBrand: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.navy },
    footerSub: { fontSize: 7.5, color: colors.gray },
    footerRight: { alignItems: 'flex-end' },
    pageNumber: { fontSize: 7.5, color: colors.gray },
  })

  const testLabel = TEST_LABELS[result.plan.selectedTest] || result.plan.selectedTest
  const interpretationParts = parseInterpretation(result.aiInterpretation || '')
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })

  const doc = (
    <Document title={`JOANResearchOS Report — ${testLabel}`} author="JOANResearchOS" creator="JOANResearchOS">
      <Page size="A4" style={styles.page} wrap>

        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerRow}>
            <Text style={styles.institution}>JOANResearchOS · Statistical Analysis Platform</Text>
            <Text style={styles.reportType}>Analysis Report</Text>
          </View>
          <Text style={styles.reportTitle}>Statistical Analysis Report</Text>
          <Text style={styles.reportSubtitle}>{testLabel} · {datasetName}</Text>
        </View>

        {/* Meta grid */}
        <View style={styles.metaGrid}>
          {[
            ['Date Generated', dateStr],
            ['Time', timeStr],
            ['Statistical Test', testLabel],
            ['Dataset', datasetName],
            ['Dependent Variable', result.plan.dependentVariable || 'N/A'],
            ['Independent Variable', result.plan.independentVariable || 'N/A'],
            ['Statistical Engine', 'R (all calculations)'],
            ['AI Assistant', 'Claude by Anthropic'],
          ].map(([label, value]) => (
            <View key={label} style={styles.metaItem}>
              <Text style={styles.metaLabel}>{label}:</Text>
              <Text style={styles.metaValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠ Transparency Notice: All statistical values in this report were computed exclusively by R.
            The AI assistant generated the R code and interpreted the output — it did not compute or estimate any statistical values.
            The complete R script and raw output are included for full reproducibility.
          </Text>
        </View>

        {/* Section 1: Research Question */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Research Question & Hypothesis</Text>
          <View style={styles.rqBox}>
            <Text style={styles.rqText}>{result.plan.researchQuestion}</Text>
          </View>
          <View style={styles.hypothesisBox}>
            <Text style={styles.hypothesisText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Null Hypothesis (H₀): </Text>
              {result.plan.hypothesis || 'Not specified'}
            </Text>
          </View>
        </View>

        {/* Section 2: Analysis Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Analysis Plan</Text>
          {result.plan.planSummary ? <Text style={styles.bodyText}>{result.plan.planSummary}</Text> : null}
          {result.plan.testRationale ? (
            <Text style={styles.bodyText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>Test rationale: </Text>
              {result.plan.testRationale}
            </Text>
          ) : null}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Parameter</Text>
              <Text style={styles.tableHeaderCell}>Value</Text>
            </View>
            {[
              ['Statistical Test', testLabel],
              ['Dependent Variable', result.plan.dependentVariable || 'N/A'],
              ['Independent Variable', result.plan.independentVariable || 'N/A'],
              ...(result.plan.additionalVariables?.length ? [['Additional Variables', result.plan.additionalVariables.join(', ')]] : []),
              ['R Execution Time', `${result.execution.executionTimeMs}ms`],
              ['Execution Status', result.execution.success ? '✓ Successful' : '✗ Failed'],
            ].map(([param, value], i) => (
              <View key={param} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowEven : {}]}>
                <Text style={styles.tableCell}>{param}</Text>
                <Text style={styles.tableCell}>{value}</Text>
              </View>
            ))}
          </View>
          {result.plan.assumptions?.length > 0 && (
            <View>
              <Text style={[styles.bodyText, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>Statistical Assumptions:</Text>
              {result.plan.assumptions.map((a, i) => (
                <View key={i} style={styles.assumptionItem}>
                  <Text style={styles.assumptionCheck}>✓</Text>
                  <Text style={styles.assumptionText}>{a}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 3: Results & Interpretation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Results & Interpretation</Text>
          <View style={[styles.statusBadge, result.execution.success ? styles.statusSuccess : styles.statusError]}>
            <Text style={[styles.statusText, result.execution.success ? styles.statusTextSuccess : styles.statusTextError]}>
              {result.execution.success ? '✓ R Executed Successfully' : '✗ R Execution Failed'}
            </Text>
          </View>
          <View style={styles.execStats}>
            <View style={styles.execStat}>
              <Text style={styles.execStatLabel}>Execution time: </Text>
              <Text style={styles.execStatValue}>{result.execution.executionTimeMs}ms</Text>
            </View>
            <View style={styles.execStat}>
              <Text style={styles.execStatLabel}>Completed: </Text>
              <Text style={styles.execStatValue}>{new Date(result.completedAt).toLocaleString('en-PH')}</Text>
            </View>
          </View>
          {interpretationParts.map((part, i) => {
            if (part.type === 'heading') {
              return <Text key={i} style={styles.sectionHeading}>{part.text}</Text>
            }
            if (!part.text.trim()) return null
            return <Text key={i} style={styles.bodyText}>{part.text}</Text>
          })}
        </View>

        {/* Section 4: Raw R Output */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>4. Raw R Output</Text>
          <Text style={[styles.bodyText, { color: colors.gray, fontSize: 8.5, marginBottom: 6 }]}>
            Verbatim console output from R. All statistical values originate from this output.
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{result.execution.rawOutput || '(no output)'}</Text>
          </View>
        </View>

        {/* Section 5: R Script */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>5. R Script (Reproducible Code)</Text>
          <Text style={[styles.bodyText, { color: colors.gray, fontSize: 8.5, marginBottom: 6 }]}>
            Generated by AI, executed by R. Copy this script to reproduce the analysis independently.
          </Text>
          <View style={styles.scriptBlock}>
            <Text style={styles.scriptText}>{result.rScript}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerBrand}>JOANResearchOS</Text>
            <Text style={styles.footerSub}>Statistical Engine: R · AI: Claude by Anthropic</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerSub}>Generated: {dateStr} {timeStr}</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} style={styles.pageNumber} />
          </View>
        </View>

      </Page>
    </Document>
  )

  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `JOANResearchOS_${result.plan.selectedTest}_${Date.now()}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// Variant for history page — builds the result object from stored fields
// since history records don't have the full AnalysisResult structure.
export async function downloadHistoryReportAsPdf(record: {
  id: string
  dataset_name: string
  research_question: string
  selected_test: string
  execution_success: boolean
  created_at: string
  ai_interpretation: string
  r_script: string
  raw_output: string
  plan_json?: Record<string, unknown> | null
}): Promise<void> {
  // Use stored plan_json if available — byte-perfect.
  // Fall back to synthetic plan for older records without plan_json.
  const plan: AnalysisPlan = record.plan_json
    ? (record.plan_json as unknown as AnalysisPlan)
    : {
        researchQuestion: record.research_question,
        hypothesis: '',
        dependentVariable: null,
        independentVariable: null,
        additionalVariables: [],
        selectedTest: record.selected_test as AnalysisPlan['selectedTest'],
        testRationale: '',
        assumptions: [],
        followUpQuestions: [],
        planSummary: '',
      }

  const syntheticResult: AnalysisResult = {
    plan,
    rScript: record.r_script,
    execution: {
      success: record.execution_success,
      rawOutput: record.raw_output,
      errorMessage: null,
      executionTimeMs: 0,
      rScript: record.r_script,
    },
    aiInterpretation: record.ai_interpretation,
    completedAt: record.created_at,
  }
  await downloadReportAsPdf(syntheticResult, record.dataset_name)
}
