import { NextRequest, NextResponse } from 'next/server'
import type { AnalysisPlan } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface QGISRequest {
  plan: AnalysisPlan
  rawOutput: string
  datasetName: string
}

function extractCSVFromOutput(
  plan: AnalysisPlan,
  rawOutput: string,
  datasetName: string
): string {
  const rows: string[] = []
  const timestamp = new Date().toISOString()
  const lines = rawOutput.split('\n')

  // ── Epidemic Curve / Moving Average ─────────────────────────────────────────
  if (['epidemic_curve', 'moving_average'].includes(plan.selectedTest)) {
    rows.push('period,case_count,cumulative_cases')
    let inSection = false
    let cumulative = 0
    for (const line of lines) {
      if (line.includes('CASE COUNTS BY PERIOD') || line.includes('DAILY COUNTS')) { inSection = true; continue }
      if (inSection && line.includes('===')) { inSection = false; continue }
      if (inSection) {
        const match = line.match(/(\d{4}-\d{2}-\d{2})\s+(\d+)/)
        if (match) {
          cumulative += parseInt(match[2])
          rows.push(`${match[1]},${match[2]},${cumulative}`)
        }
      }
    }
    return [
      `# QGIS Export — ${plan.selectedTest} — ${datasetName}`,
      `# Generated: ${timestamp}`,
      `# Research Question: ${plan.researchQuestion}`,
      `# How to import: QGIS > Layer > Add Layer > Add Delimited Text Layer`,
      `# Use the 'period' column to join with time-series basemaps`,
      '', ...rows
    ].join('\n')
  }

  // ── Attack Rate Table ────────────────────────────────────────────────────────
  if (plan.selectedTest === 'attack_rate_table') {
    rows.push('exposure_group,cases,total,attack_rate_pct')
    let inSection = false
    for (const line of lines) {
      if (line.includes('ATTACK RATES')) { inSection = true; continue }
      if (inSection && line.includes('===')) { inSection = false; continue }
      if (inSection) {
        const match = line.match(/Group:\s*(.+?)\s*\|\s*Cases:\s*(\d+)\s*\|\s*Total:\s*(\d+)\s*\|\s*AR:\s*([\d.]+)%/)
        if (match) rows.push(`"${match[1].trim()}",${match[2]},${match[3]},${match[4]}`)
      }
    }
    const rrMatch = rawOutput.match(/Risk Ratio[:\s]+([\d.]+)/)
    const orMatch = rawOutput.match(/Odds Ratio[:\s]+([\d.]+)/)
    return [
      `# QGIS Export — Attack Rate Table — ${datasetName}`,
      `# Generated: ${timestamp}`,
      `# Research Question: ${plan.researchQuestion}`,
      `# How to import: QGIS > Layer > Add Layer > Add Delimited Text Layer`,
      `# Join to barangay/municipality shapefile using the exposure_group column`,
      rrMatch ? `# Risk Ratio: ${rrMatch[1]}` : '',
      orMatch ? `# Odds Ratio: ${orMatch[1]}` : '',
      '', ...rows
    ].filter(Boolean).join('\n')
  }

  // ── Age-Sex Pyramid ──────────────────────────────────────────────────────────
  if (plan.selectedTest === 'age_sex_pyramid') {
    rows.push('age_group,female_count,male_count')
    let inSection = false
    let headers: string[] = []
    for (const line of lines) {
      if (line.includes('AGE GROUP BY SEX')) { inSection = true; continue }
      if (inSection && line.trim().startsWith('Female')) { headers = ['Female', 'Male']; continue }
      if (inSection && line.includes('===')) { inSection = false; continue }
      if (inSection && line.trim()) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 3 && parts[0].includes('-') || parts[0].includes('+')) {
          rows.push(`"${parts[0]}",${parts[1] || 0},${parts[2] || 0}`)
        }
      }
    }
    return [
      `# QGIS Export — Age-Sex Pyramid — ${datasetName}`,
      `# Generated: ${timestamp}`,
      `# Research Question: ${plan.researchQuestion}`,
      `# How to import: QGIS > Layer > Add Layer > Add Delimited Text Layer`,
      `# Use for chart layer or join to age-stratified population data`,
      '', ...rows
    ].join('\n')
  }

  // ── Survival Analysis ────────────────────────────────────────────────────────
  if (plan.selectedTest === 'survival_analysis') {
    rows.push('time_days,survival_probability,n_risk,n_event,n_censored')
    const kmMatch = rawOutput.match(/time=(\d+)\s+n\.risk=(\d+)\s+n\.event=(\d+)\s+survival=([\d.]+)/g)
    if (kmMatch) {
      for (const m of kmMatch) {
        const p = m.match(/time=(\d+)\s+n\.risk=(\d+)\s+n\.event=(\d+)\s+survival=([\d.]+)/)
        if (p) rows.push(`${p[1]},${p[4]},${p[2]},${p[3]},`)
      }
    }
    const cfrMatch = rawOutput.match(/Case Fatality Rate:\s*([\d.]+)%/)
    return [
      `# QGIS Export — Survival Analysis — ${datasetName}`,
      `# Generated: ${timestamp}`,
      `# Research Question: ${plan.researchQuestion}`,
      cfrMatch ? `# Overall CFR: ${cfrMatch[1]}%` : '',
      `# How to import: QGIS > Layer > Add Layer > Add Delimited Text Layer`,
      '', ...rows
    ].filter(Boolean).join('\n')
  }

  // ── Generic fallback ─────────────────────────────────────────────────────────
  return [
    `# QGIS Export — ${plan.selectedTest} — ${datasetName}`,
    `# Generated: ${timestamp}`,
    `# Research Question: ${plan.researchQuestion}`,
    '',
    'line_number,output',
    ...rawOutput.split('\n').slice(0, 100).map((l, i) => `${i + 1},"${l.replace(/"/g, "'")}"`)
  ].join('\n')
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
