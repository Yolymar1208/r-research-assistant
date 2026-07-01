import { NextRequest, NextResponse } from 'next/server'
import type { AnalysisPlan } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface QGISRequest {
  plan: AnalysisPlan
  rawOutput: string
  datasetName: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csvHeader(plan: AnalysisPlan, datasetName: string, notes: string[] = []): string[] {
  return [
    `# QGIS Export — ${plan.selectedTest} — ${datasetName}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Research Question: ${plan.researchQuestion}`,
    `# How to import: QGIS > Layer > Add Layer > Add Delimited Text Layer`,
    ...notes.map(n => `# ${n}`),
    '',
  ]
}

function firstMatch(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[1] ?? ''
}

// ─── Epi extractors (existing, preserved) ────────────────────────────────────

function extractEpidemicCurve(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['period,case_count,cumulative_cases']
  const lines = rawOutput.split('\n')
  let inSection = false; let cumulative = 0
  for (const line of lines) {
    if (line.includes('CASE COUNTS BY PERIOD') || line.includes('DAILY COUNTS')) { inSection = true; continue }
    if (inSection && line.includes('===')) { inSection = false; continue }
    if (inSection) {
      const match = line.match(/(\d{4}-\d{2}-\d{2})\s+(\d+)/)
      if (match) { cumulative += parseInt(match[2]); rows.push(`${match[1]},${match[2]},${cumulative}`) }
    }
  }
  return [...csvHeader(plan, datasetName, ['Use the period column to join with time-series basemaps']), ...rows].join('\n')
}

function extractMovingAverage(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['date,daily_cases,moving_avg_7day']
  const lines = rawOutput.split('\n')
  let inSection = false
  for (const line of lines) {
    if (line.includes('DAILY COUNTS WITH 7-DAY')) { inSection = true; continue }
    if (inSection && line.includes('===')) { inSection = false; continue }
    if (inSection) {
      const match = line.match(/(\d{4}-\d{2}-\d{2})\s+(\d+)\s+([\d.NA]+)/)
      if (match) rows.push(`${match[1]},${match[2]},${match[3].replace('NA', '')}`)
    }
  }
  return [...csvHeader(plan, datasetName, ['Join date column to time-series data for trend mapping']), ...rows].join('\n')
}

function extractAttackRate(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['exposure_group,cases,total,attack_rate_pct']
  const lines = rawOutput.split('\n')
  let inSection = false
  for (const line of lines) {
    if (line.includes('ATTACK RATES')) { inSection = true; continue }
    if (inSection && line.includes('===')) { inSection = false; continue }
    if (inSection) {
      const match = line.match(/Group:\s*(.+?)\s*\|\s*Cases:\s*(\d+)\s*\|\s*Total:\s*(\d+)\s*\|\s*AR:\s*([\d.]+)%/)
      if (match) rows.push(`"${match[1].trim()}",${match[2]},${match[3]},${match[4]}`)
    }
  }
  const rr = firstMatch(rawOutput, /Risk Ratio[:\s]+([\d.]+)/)
  const or = firstMatch(rawOutput, /Odds Ratio[:\s]+([\d.]+)/)
  return [...csvHeader(plan, datasetName, [
    'Join exposure_group to barangay/municipality shapefile',
    rr ? `Risk Ratio: ${rr}` : '',
    or ? `Odds Ratio: ${or}` : '',
  ].filter(Boolean)), ...rows].join('\n')
}

function extractAgeSexPyramid(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['age_group,female_count,male_count']
  const lines = rawOutput.split('\n')
  let inSection = false
  for (const line of lines) {
    if (line.includes('AGE GROUP BY SEX')) { inSection = true; continue }
    if (inSection && line.includes('===')) { inSection = false; continue }
    if (inSection && line.trim()) {
      const parts = line.trim().split(/\s+/)
      if (parts[0]?.match(/\d+-\d+|\d+\+/)) rows.push(`"${parts[0]}",${parts[1] || 0},${parts[2] || 0}`)
    }
  }
  return [...csvHeader(plan, datasetName, ['Join age_group to age-stratified population data for rate calculation']), ...rows].join('\n')
}

function extractSurvival(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['time_days,survival_probability,n_risk,n_event']
  const kmMatches = rawOutput.match(/time=(\d+)\s+n\.risk=(\d+)\s+n\.event=(\d+)\s+survival=([\d.]+)/g) || []
  for (const m of kmMatches) {
    const p = m.match(/time=(\d+)\s+n\.risk=(\d+)\s+n\.event=(\d+)\s+survival=([\d.]+)/)
    if (p) rows.push(`${p[1]},${p[4]},${p[2]},${p[3]}`)
  }
  const cfr = firstMatch(rawOutput, /Case Fatality Rate:\s*([\d.]+)%/)
  return [...csvHeader(plan, datasetName, [cfr ? `Overall CFR: ${cfr}%` : '']), ...rows].filter(Boolean).join('\n')
}

// ─── Non-epi extractors (new) ─────────────────────────────────────────────────

function extractDescriptive(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  // Extract psych::describe() output — tab-separated variable summaries
  const rows: string[] = ['variable,n,mean,sd,median,min,max,skew,kurtosis']
  const lines = rawOutput.split('\n')
  let inDescribe = false
  for (const line of lines) {
    if (line.match(/^\s*(vars|variable)\s+n\s+mean/i)) { inDescribe = true; continue }
    if (inDescribe && line.trim() === '') { inDescribe = false; continue }
    if (inDescribe) {
      const parts = line.trim().split(/\s+/)
      // psych::describe rows: varname vars n mean sd median trimmed mad min max range skew kurtosis se
      if (parts.length >= 9) {
        const varName = parts[0].replace(/[*]/g, '')
        rows.push(`"${varName}",${parts[2] || ''},${parts[3] || ''},${parts[4] || ''},${parts[5] || ''},${parts[9] || ''},${parts[10] || ''},${parts[12] || ''},${parts[13] || ''}`)
      }
    }
  }
  return [...csvHeader(plan, datasetName, ['One row per variable — join by variable name or use standalone']), ...rows].join('\n')
}

function extractTTest(plan: AnalysisPlan, rawOutput: string, datasetName: string, paired = false): string {
  const rows: string[] = paired
    ? ['comparison,mean_before,mean_after,mean_diff,t_statistic,df,p_value,ci_lower,ci_upper']
    : ['group,n,mean,t_statistic,df,p_value,ci_lower,ci_upper,cohens_d']

  // Extract group means from tapply output
  const meanMatches = rawOutput.match(/([A-Za-z0-9_\s]+)\s+([\d.]+)\s*\n/g) || []
  const tMatch = rawOutput.match(/t\s*=\s*([-\d.]+)/)
  const dfMatch = rawOutput.match(/df\s*=\s*([\d.]+)/)
  const pMatch = rawOutput.match(/p-value\s*[<=]\s*([\d.e-]+)/)
  // Extract CI bounds without dotAll flag — find the CI line then grab the numbers before it
  const ciIdx = rawOutput.indexOf('95 percent confidence interval')
  const ciLine = ciIdx > 0 ? rawOutput.slice(Math.max(0, ciIdx - 60), ciIdx) : ''
  const ciNums = ciLine.match(/([-\d.]+)\s+([-\d.]+)\s*$/)
  const dMatch = rawOutput.match(/Cohen's d[^\n]+([-\d.]+)/)

  if (paired) {
    rows.push(`"${plan.independentVariable} vs ${plan.dependentVariable}","","","",${tMatch?.[1] || ''},${dfMatch?.[1] || ''},${pMatch?.[1] || ''},"","",`)
  } else {
    // Get the tapply means block
    const meansBlock = rawOutput.match(/\n([\w\s]+)\n([\d.]+)\s*\n([\w\s]+)\n([\d.]+)/)
    if (meansBlock) {
      rows.push(`"${meansBlock[1].trim()}","",${meansBlock[2]},${tMatch?.[1] || ''},${dfMatch?.[1] || ''},${pMatch?.[1] || ''},${ciNums?.[1] || ''},${ciNums?.[2] || ''},${dMatch?.[1] || ''}`)
      rows.push(`"${meansBlock[3].trim()}","",${meansBlock[4]},"","","","","","",`)
    } else {
      rows.push(`"Group 1","","",${tMatch?.[1] || ''},${dfMatch?.[1] || ''},${pMatch?.[1] || ''},${ciNums?.[1] || ''},${ciNums?.[2] || ''},${dMatch?.[1] || ''}`)
    }
  }
  return [...csvHeader(plan, datasetName, ['Join group column to geographic unit (barangay/facility/area)']), ...rows].join('\n')
}

function extractANOVA(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['group,mean,tukey_group']
  const lines = rawOutput.split('\n')
  // Extract group means from tapply
  let inMeans = false
  for (const line of lines) {
    if (line.match(/tapply|group mean/i)) { inMeans = true; continue }
    if (inMeans && line.trim() === '') { inMeans = false; continue }
    if (inMeans) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2 && !isNaN(parseFloat(parts[parts.length - 1]))) {
        rows.push(`"${parts.slice(0, -1).join(' ')}",${parts[parts.length - 1]},`)
      }
    }
  }
  const fMatch = rawOutput.match(/F value\s+([\d.]+)/)
  const pMatch = rawOutput.match(/Pr\(>F\)\s*([\d.e-]+)/)
  const etaMatch = rawOutput.match(/Eta2\s*\|?\s*([\d.]+)/)
  return [...csvHeader(plan, datasetName, [
    fMatch ? `F = ${fMatch[1]}` : '',
    pMatch ? `p = ${pMatch[1]}` : '',
    etaMatch ? `Eta-squared = ${etaMatch[1]}` : '',
    'Join group column to geographic unit for spatial comparison',
  ].filter(Boolean)), ...rows].join('\n')
}

function extractChiSquare(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['group,outcome,count,row_percent']
  const lines = rawOutput.split('\n')
  let inTable = false; let headers: string[] = []
  for (const line of lines) {
    if (line.match(/addmargins|contingency/i)) { inTable = true; continue }
    if (inTable && line.trim().startsWith('Sum')) { inTable = false; continue }
    if (inTable && line.trim()) {
      if (!headers.length && line.includes('  ')) {
        headers = line.trim().split(/\s{2,}/)
        continue
      }
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2) {
        const group = parts[0]
        parts.slice(1).forEach((count, i) => {
          if (!isNaN(parseInt(count)) && headers[i]) {
            rows.push(`"${group}","${headers[i]}",${count},`)
          }
        })
      }
    }
  }
  const chiMatch = rawOutput.match(/X-squared\s*=\s*([\d.]+)/)
  const pMatch = rawOutput.match(/p-value\s*[<=]\s*([\d.e-]+)/)
  const vMatch = rawOutput.match(/Cramer's V[^\n]+([\d.]+)/)
  return [...csvHeader(plan, datasetName, [
    chiMatch ? `Chi-squared = ${chiMatch[1]}` : '',
    pMatch ? `p-value = ${pMatch[1]}` : '',
    vMatch ? `Cramer's V = ${vMatch[1]}` : '',
    'Join group column to barangay/area shapefile',
  ].filter(Boolean)), ...rows].join('\n')
}

function extractCorrelation(plan: AnalysisPlan, rawOutput: string, datasetName: string, method: 'pearson' | 'spearman'): string {
  const rows: string[] = ['variable_1,variable_2,correlation_coefficient,p_value,ci_lower,ci_upper,method']
  const rMatch = rawOutput.match(/cor\s*=\s*([-\d.]+)/) || rawOutput.match(/rho\s*=\s*([-\d.]+)/)
  const pMatch = rawOutput.match(/p-value\s*[<=]\s*([\d.e-]+)/)
  const ciIdx2 = rawOutput.indexOf('95 percent confidence interval')
  const ciLine2 = ciIdx2 > 0 ? rawOutput.slice(Math.max(0, ciIdx2 - 60), ciIdx2) : ''
  const ciNums2 = ciLine2.match(/([-\d.]+)\s+([-\d.]+)\s*$/)
  rows.push(`"${plan.dependentVariable || ''}","${plan.independentVariable || ''}",${rMatch?.[1] || ''},${pMatch?.[1] || ''},${ciNums2?.[1] || ''},${ciNums2?.[2] || ''},${method}`)
  return [...csvHeader(plan, datasetName, [
    `Correlation method: ${method}`,
    'Use as attribute table for scatter plot layer in QGIS',
  ]), ...rows].join('\n')
}

function extractMannWhitney(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['group,median,w_statistic,p_value,rank_biserial_r']
  const wMatch = rawOutput.match(/W\s*=\s*([\d.]+)/)
  const pMatch = rawOutput.match(/p-value\s*[<=]\s*([\d.e-]+)/)
  const rMatch = rawOutput.match(/rank_biserial[^\n]+([-\d.]+)/)
  rows.push(`"${plan.independentVariable || 'Group'}","","",${wMatch?.[1] || ''},${pMatch?.[1] || ''},${rMatch?.[1] || ''}`)
  return [...csvHeader(plan, datasetName, ['Join group column to geographic unit']), ...rows].join('\n')
}

function extractWilcoxon(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['comparison,v_statistic,p_value,rank_biserial_r']
  const vMatch = rawOutput.match(/V\s*=\s*([\d.]+)/)
  const pMatch = rawOutput.match(/p-value\s*[<=]\s*([\d.e-]+)/)
  const rMatch = rawOutput.match(/rank_biserial[^\n]+([-\d.]+)/)
  rows.push(`"${plan.independentVariable} vs ${plan.dependentVariable}",${vMatch?.[1] || ''},${pMatch?.[1] || ''},${rMatch?.[1] || ''}`)
  return [...csvHeader(plan, datasetName), ...rows].join('\n')
}

function extractKruskalWallis(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['group,median,h_statistic,df,p_value']
  const hMatch = rawOutput.match(/Kruskal-Wallis chi-squared\s*=\s*([\d.]+)/)
  const dfMatch = rawOutput.match(/df\s*=\s*(\d+)/)
  const pMatch = rawOutput.match(/p-value\s*[<=]\s*([\d.e-]+)/)
  // Extract group medians from tapply output
  const lines = rawOutput.split('\n')
  let inMeds = false
  for (const line of lines) {
    if (line.match(/tapply.*median/i)) { inMeds = true; continue }
    if (inMeds && line.trim() === '') { inMeds = false; continue }
    if (inMeds) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2 && !isNaN(parseFloat(parts[parts.length - 1]))) {
        rows.push(`"${parts.slice(0, -1).join(' ')}",${parts[parts.length - 1]},${hMatch?.[1] || ''},${dfMatch?.[1] || ''},${pMatch?.[1] || ''}`)
      }
    }
  }
  if (rows.length === 1) rows.push(`"All groups","",${hMatch?.[1] || ''},${dfMatch?.[1] || ''},${pMatch?.[1] || ''}`)
  return [...csvHeader(plan, datasetName, ['Join group column to geographic unit']), ...rows].join('\n')
}

function extractFishersExact(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['group,outcome,count']
  const lines = rawOutput.split('\n')
  let inTable = false; let headers: string[] = []
  for (const line of lines) {
    if (line.match(/addmargins/i)) { inTable = true; continue }
    if (inTable && line.trim().startsWith('Sum')) { inTable = false; continue }
    if (inTable && line.trim() && !line.match(/Outcome/i)) {
      if (!headers.length) { headers = line.trim().split(/\s{2,}/); continue }
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2) {
        const group = parts[0]
        parts.slice(1).forEach((count, i) => {
          if (!isNaN(parseInt(count)) && headers[i]) rows.push(`"${group}","${headers[i]}",${count}`)
        })
      }
    }
  }
  const orMatch = rawOutput.match(/odds ratio[^\n]+([\d.]+)/i)
  const pMatch = rawOutput.match(/p-value\s*[<=]\s*([\d.e-]+)/)
  return [...csvHeader(plan, datasetName, [
    orMatch ? `Odds Ratio: ${orMatch[1]}` : '',
    pMatch ? `p-value: ${pMatch[1]}` : '',
  ].filter(Boolean)), ...rows].join('\n')
}

function extractMcNemar(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['cell,count,description']
  const pMatch = rawOutput.match(/p-value\s*[<=]\s*([\d.e-]+)/)
  const orMatch = rawOutput.match(/Odds ratio[:\s]+([\d.]+)/)
  const bMatch = rawOutput.match(/b\s*=\s*(\d+)/)
  const cMatch = rawOutput.match(/c\s*=\s*(\d+)/)
  if (bMatch) rows.push(`"b (discordant before+)",${bMatch[1]},"Positive before, negative after"`)
  if (cMatch) rows.push(`"c (discordant before-)",${cMatch[1]},"Negative before, positive after"`)
  return [...csvHeader(plan, datasetName, [
    pMatch ? `p-value: ${pMatch[1]}` : '',
    orMatch ? `Odds Ratio: ${orMatch[1]}` : '',
  ].filter(Boolean)), ...rows].join('\n')
}

function extractLogisticRegression(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['predictor,odds_ratio,ci_lower,ci_upper,p_value']
  const lines = rawOutput.split('\n')
  let inOR = false
  for (const line of lines) {
    if (line.match(/Odds Ratios.*95/i)) { inOR = true; continue }
    if (inOR && line.trim() === '') { inOR = false; continue }
    if (inOR) {
      const match = line.match(/^(.+?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
      if (match && match[1].trim() !== '') rows.push(`"${match[1].trim()}",${match[2]},${match[3]},${match[4]},`)
    }
  }
  const aicMatch = rawOutput.match(/AIC:\s*([\d.]+)/)
  const r2Match = rawOutput.match(/Nagelkerke R2:\s*([\d.]+)/)
  return [...csvHeader(plan, datasetName, [
    aicMatch ? `AIC: ${aicMatch[1]}` : '',
    r2Match ? `Nagelkerke R2: ${r2Match[1]}` : '',
    'Join predictor to geographic unit for spatial OR mapping',
  ].filter(Boolean)), ...rows].join('\n')
}

function extractLinearRegression(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  const rows: string[] = ['predictor,coefficient,ci_lower,ci_upper,std_error,t_value,p_value']
  const lines = rawOutput.split('\n')
  let inCoef = false
  for (const line of lines) {
    if (line.match(/^Coefficients:/i)) { inCoef = true; continue }
    if (inCoef && line.trim() === '') { inCoef = false; continue }
    if (inCoef && !line.match(/Estimate|---/)) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 5) rows.push(`"${parts[0]}",${parts[1]},,,${parts[2]},${parts[3]},${parts[4]}`)
    }
  }
  const r2Match = rawOutput.match(/R-squared:\s*([\d.]+)/)
  const adjR2Match = rawOutput.match(/Adj R-squared:\s*([\d.]+)/)
  return [...csvHeader(plan, datasetName, [
    r2Match ? `R-squared: ${r2Match[1]}` : '',
    adjR2Match ? `Adjusted R-squared: ${adjR2Match[1]}` : '',
    'Join predictor to geographic unit for spatial coefficient mapping',
  ].filter(Boolean)), ...rows].join('\n')
}

// ─── Router ───────────────────────────────────────────────────────────────────

function extractCSVFromOutput(plan: AnalysisPlan, rawOutput: string, datasetName: string): string {
  switch (plan.selectedTest) {
    case 'epidemic_curve':       return extractEpidemicCurve(plan, rawOutput, datasetName)
    case 'moving_average':       return extractMovingAverage(plan, rawOutput, datasetName)
    case 'attack_rate_table':    return extractAttackRate(plan, rawOutput, datasetName)
    case 'age_sex_pyramid':      return extractAgeSexPyramid(plan, rawOutput, datasetName)
    case 'survival_analysis':    return extractSurvival(plan, rawOutput, datasetName)
    case 'descriptive_statistics': return extractDescriptive(plan, rawOutput, datasetName)
    case 'independent_t_test':   return extractTTest(plan, rawOutput, datasetName, false)
    case 'paired_t_test':        return extractTTest(plan, rawOutput, datasetName, true)
    case 'one_way_anova':        return extractANOVA(plan, rawOutput, datasetName)
    case 'chi_square':           return extractChiSquare(plan, rawOutput, datasetName)
    case 'pearson_correlation':  return extractCorrelation(plan, rawOutput, datasetName, 'pearson')
    case 'spearman_correlation': return extractCorrelation(plan, rawOutput, datasetName, 'spearman')
    case 'mann_whitney':         return extractMannWhitney(plan, rawOutput, datasetName)
    case 'wilcoxon_signed_rank': return extractWilcoxon(plan, rawOutput, datasetName)
    case 'kruskal_wallis':       return extractKruskalWallis(plan, rawOutput, datasetName)
    case 'fishers_exact':        return extractFishersExact(plan, rawOutput, datasetName)
    case 'mcnemar':              return extractMcNemar(plan, rawOutput, datasetName)
    case 'logistic_regression':  return extractLogisticRegression(plan, rawOutput, datasetName)
    case 'linear_regression':    return extractLinearRegression(plan, rawOutput, datasetName)
    default:
      return [
        ...csvHeader(plan, datasetName),
        'line_number,output',
        ...rawOutput.split('\n').slice(0, 100).map((l, i) => `${i + 1},"${l.replace(/"/g, "'")}"`)
      ].join('\n')
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: QGISRequest = await request.json()
    const { plan, rawOutput, datasetName } = body

    if (!rawOutput || !plan) {
      return NextResponse.json({ success: false, error: 'Missing analysis data' }, { status: 400 })
    }

    const csv = extractCSVFromOutput(plan, rawOutput, datasetName)
    const filename = `QGIS_${plan.selectedTest}_${datasetName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
