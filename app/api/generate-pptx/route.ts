import { NextRequest, NextResponse } from 'next/server'
import type { AnalysisPlan, RExecutionResult } from '@/app/types'

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
  spearman_correlation: 'Spearman Correlation',
  fishers_exact: "Fisher's Exact Test",
  mcnemar: "McNemar's Test",
  logistic_regression: 'Logistic Regression',
  linear_regression: 'Linear Regression',
  epidemic_curve: 'Epidemic Curve',
  attack_rate_table: 'Attack Rate Table',
  age_sex_pyramid: 'Age-Sex Pyramid',
  survival_analysis: 'Survival Analysis',
  moving_average: '7-Day Moving Average',
}

const EPI_TESTS = new Set(['epidemic_curve', 'attack_rate_table', 'age_sex_pyramid', 'survival_analysis', 'moving_average'])

const C = {
  navy:    '050B1A',
  navyMid: '0D1830',
  navyDark:'030712',
  violet:  '7C5CFF',
  blue:    '2E75B6',
  gold:    'E8B85C',
  white:   'FFFFFF',
  muted:   'A0ACCC',
  dim:     '4A6A85',
  light:   'F4F6FB',
  lightMid:'E8EDF5',
  green:   '22C55E',
  text:    '1E293B',
  textMid: '475569',
}

function cleanText(t: string): string {
  return t
    .replace(/^---+$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/#{1,3} /g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseSections(interpretation: string) {
  const sections: { title: string; body: string }[] = []
  const cleaned = cleanText(interpretation)
  const lines = cleaned.split('\n')
  let title = ''
  let body: string[] = []

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    // Detect section headers: "1. Title", "## Title", "Title" followed by content
    if (/^\d+\.\s+\w/.test(t) && t.length < 80) {
      if (title || body.length) sections.push({ title, body: body.join(' ').trim() })
      title = t.replace(/^\d+\.\s+/, '').trim()
      body = []
    } else {
      body.push(t)
    }
  }
  if (title || body.length) sections.push({ title, body: body.join(' ').trim() })
  return sections.filter(s => s.body.length > 10)
}

function extractRecommendations(interpretation: string): string[] {
  const recs: string[] = []
  const lines = interpretation.split('\n')
  let inRec = false
  for (const line of lines) {
    const t = line.trim()
    if (/recommendation/i.test(t)) { inRec = true; continue }
    if (inRec && /^\d+[\.\)]\s/.test(t)) {
      const clean = t.replace(/^\d+[\.\)]\s*/, '').replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim()
      if (clean.length > 15) recs.push(clean)
    }
    if (inRec && /^#{1,3}\s+\d+/.test(t) && !/recommendation/i.test(t)) break
  }
  return recs.slice(0, 5)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { plan, execution, aiInterpretation, datasetName, chartBase64 } = body as {
      plan: AnalysisPlan
      execution: RExecutionResult
      aiInterpretation: string
      datasetName: string
      chartBase64?: string
    }

    const PptxGenJS = (await import('pptxgenjs')).default
    const pres = new PptxGenJS()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SH = (pres as any).shapes

    pres.layout = 'LAYOUT_16x9'
    pres.author = 'JOANResearchOS'
    pres.title = `${TEST_LABELS[plan.selectedTest] || plan.selectedTest} — JOANResearchOS`

    const testLabel = TEST_LABELS[plan.selectedTest] || plan.selectedTest
    const isEpi = EPI_TESTS.has(plan.selectedTest)
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    const sections = parseSections(aiInterpretation)
    const recommendations = extractRecommendations(aiInterpretation)
    const hasChart = !!(chartBase64 && typeof chartBase64 === 'string' && chartBase64.startsWith('data:image'))

    // ── SLIDE 1: TITLE ──────────────────────────────────────────────────────
    const s1 = pres.addSlide()
    s1.background = { color: C.navy }

    // Large violet hexagon accent (top-left corner decoration)
    s1.addShape(SH.ROUNDED_RECTANGLE, {
      x: -0.3, y: -0.3, w: 1.4, h: 1.4,
      fill: { color: C.violet, transparency: 75 },
      line: { color: C.violet, transparency: 60 },
      rectRadius: 0.15,
    })

    // J mark
    s1.addShape(SH.ROUNDED_RECTANGLE, {
      x: 0.5, y: 0.4, w: 0.65, h: 0.65,
      fill: { color: C.violet }, line: { color: C.violet }, rectRadius: 0.1,
    })
    s1.addText('J', { x: 0.5, y: 0.4, w: 0.65, h: 0.65, fontSize: 24, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0 })

    // App name
    s1.addText('JOANResearchOS', { x: 1.3, y: 0.52, w: 3.5, h: 0.3, fontSize: 12, bold: true, color: C.muted, fontFace: 'Calibri', margin: 0 })

    // Test type badge
    s1.addShape(SH.ROUNDED_RECTANGLE, {
      x: 0.5, y: 1.3, w: 2.5, h: 0.38,
      fill: { color: C.violet, transparency: 80 }, line: { color: C.violet }, rectRadius: 0.08,
    })
    s1.addText(isEpi ? '🦠 Epidemiology' : '📊 Statistical Analysis', {
      x: 0.5, y: 1.3, w: 2.5, h: 0.38, fontSize: 10, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0,
    })

    // Main title
    s1.addText(testLabel, {
      x: 0.5, y: 1.85, w: 9, h: 1.1,
      fontSize: 42, bold: true, color: C.white, fontFace: 'Cambria', align: 'left', valign: 'middle', margin: 0,
    })

    // Divider line
    s1.addShape(SH.RECTANGLE, { x: 0.5, y: 3.1, w: 9, h: 0.03, fill: { color: C.violet }, line: { color: C.violet } })

    // Research question
    const rq = plan.researchQuestion.length > 180 ? plan.researchQuestion.slice(0, 177) + '…' : plan.researchQuestion
    s1.addText(`"${rq}"`, {
      x: 0.5, y: 3.25, w: 9, h: 0.9,
      fontSize: 15, italic: true, color: C.muted, fontFace: 'Calibri', align: 'left', valign: 'top', wrap: true, margin: 0,
    })

    // Meta info row
    s1.addText(`${datasetName}   ·   ${today}`, {
      x: 0.5, y: 4.25, w: 9, h: 0.3, fontSize: 11, color: C.dim, fontFace: 'Calibri', align: 'left', margin: 0,
    })

    // Three bottom badges
    const badges = [
      { label: 'Statistical Engine: R', color: C.blue },
      { label: 'AI: Claude by Anthropic', color: C.violet },
      { label: 'All values computed by R', color: '166534' },
    ]
    badges.forEach((b, i) => {
      const bx = 0.5 + i * 3.1
      s1.addShape(SH.ROUNDED_RECTANGLE, { x: bx, y: 4.75, w: 2.9, h: 0.4, fill: { color: b.color, transparency: 82 }, line: { color: b.color }, rectRadius: 0.08 })
      s1.addText(b.label, { x: bx, y: 4.75, w: 2.9, h: 0.4, fontSize: 9, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 })
    })

    s1.addNotes(`${testLabel} — ${plan.researchQuestion}\nDataset: ${datasetName} | Date: ${today}`)

    // ── SLIDE 2: CHART (only if chart exists) ──────────────────────────────
    if (hasChart) {
      const s2 = pres.addSlide()
      s2.background = { color: C.light }

      // Header band
      s2.addShape(SH.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: C.navy }, line: { color: C.navy } })
      s2.addText(testLabel, { x: 0.45, y: 0, w: 7, h: 0.75, fontSize: 22, bold: true, color: C.white, fontFace: 'Cambria', valign: 'middle', margin: 0 })
      s2.addText('R · ggplot2', { x: 8, y: 0, w: 1.8, h: 0.75, fontSize: 10, color: C.muted, align: 'right', valign: 'middle', fontFace: 'Calibri', margin: 0 })

      // Chart image — full width
      const b64Clean = chartBase64!.replace(/^data:image\/png;base64,/, '')
      s2.addImage({ data: `image/png;base64,${b64Clean}`, x: 0.3, y: 0.88, w: 9.4, h: 4.45 })

      // Caption
      s2.addText('Generated by R using ggplot2 · All values computed by R · JOANResearchOS', {
        x: 0.3, y: 5.4, w: 9.4, h: 0.25, fontSize: 8, color: C.dim, align: 'center', italic: true, fontFace: 'Calibri', margin: 0,
      })
      s2.addNotes(`Chart generated by R using ggplot2. All values are from R output.`)
    }

    // ── SLIDE 3: KEY FINDINGS ───────────────────────────────────────────────
    const s3 = pres.addSlide()
    s3.background = { color: C.navy }

    s3.addShape(SH.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: C.gold, transparency: 20 }, line: { color: C.gold } })
    s3.addText('Key Findings', { x: 0.45, y: 0, w: 9, h: 0.75, fontSize: 28, bold: true, color: C.white, fontFace: 'Cambria', valign: 'middle', margin: 0 })

    // Summary box
    const summarySection = sections.find(s => /summary|finding/i.test(s.title)) || sections[0]
    if (summarySection) {
      s3.addShape(SH.ROUNDED_RECTANGLE, {
        x: 0.4, y: 0.9, w: 9.2, h: 2.0,
        fill: { color: C.navyMid }, line: { color: C.violet, pt: 1 }, rectRadius: 0.1,
      })
      const sumText = summarySection.body.slice(0, 600)
      s3.addText(sumText, {
        x: 0.6, y: 0.98, w: 8.8, h: 1.84, fontSize: 12, color: 'D1D9F0', fontFace: 'Calibri',
        align: 'left', valign: 'top', wrap: true, margin: 0,
      })
    }

    // Stat highlight cards — pull numbers from R output
    const rawLines = execution.rawOutput
      .split('\n')
      .filter(l => /[=:]\s*[\d.]+/.test(l) && l.length < 80)
      .slice(0, 3)

    const cardColors = [C.violet, C.blue, C.gold]
    rawLines.forEach((line, i) => {
      const parts = line.replace(/[=:]+/, '|').split('|')
      const label = (parts[0] || '').trim().replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 35)
      const value = ((parts[1] || '')).trim().split(/\s/)[0].slice(0, 12)
      const bx = 0.4 + i * 3.1
      s3.addShape(SH.ROUNDED_RECTANGLE, { x: bx, y: 3.1, w: 2.9, h: 1.5, fill: { color: cardColors[i], transparency: 78 }, line: { color: cardColors[i] }, rectRadius: 0.1 })
      s3.addText(value, { x: bx, y: 3.25, w: 2.9, h: 0.7, fontSize: 26, bold: true, color: C.white, align: 'center', fontFace: 'Cambria', margin: 0 })
      s3.addText(label, { x: bx, y: 3.95, w: 2.9, h: 0.55, fontSize: 9, color: C.muted, align: 'center', fontFace: 'Calibri', wrap: true, margin: 0 })
    })

    s3.addText('All statistics computed by R — not AI-estimated', {
      x: 0.4, y: 4.8, w: 9.2, h: 0.25, fontSize: 8, color: C.dim, align: 'center', italic: true, fontFace: 'Calibri', margin: 0,
    })
    s3.addNotes(`Key findings: ${summarySection?.body?.slice(0, 500) || ''}`)

    // ── SLIDE 4: INTERPRETATION ─────────────────────────────────────────────
    const s4 = pres.addSlide()
    s4.background = { color: C.light }

    s4.addShape(SH.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: C.navy }, line: { color: C.navy } })
    s4.addText('AI Interpretation', { x: 0.45, y: 0, w: 7, h: 0.75, fontSize: 22, bold: true, color: C.white, fontFace: 'Cambria', valign: 'middle', margin: 0 })
    s4.addText('Written from verified R output', { x: 7.2, y: 0, w: 2.5, h: 0.75, fontSize: 9, color: C.muted, align: 'right', valign: 'middle', fontFace: 'Calibri', margin: 0 })

    // Up to 4 sections in a 2x2 grid
    const interpSections = sections.filter(s => !/recommendation/i.test(s.title)).slice(0, 4)
    const positions = [
      { x: 0.3, y: 0.9 },
      { x: 5.15, y: 0.9 },
      { x: 0.3, y: 3.1 },
      { x: 5.15, y: 3.1 },
    ]
    const accentColors = [C.violet, C.blue, C.gold, '22C55E']

    interpSections.forEach((sec, i) => {
      const pos = positions[i]
      const w = 4.6
      const h = 1.9
      s4.addShape(SH.ROUNDED_RECTANGLE, { x: pos.x, y: pos.y, w, h, fill: { color: C.white }, line: { color: C.lightMid }, rectRadius: 0.08 })
      s4.addShape(SH.RECTANGLE, { x: pos.x, y: pos.y, w, h: 0.04, fill: { color: accentColors[i] }, line: { color: accentColors[i] } })
      const secTitle = sec.title.slice(0, 45)
      s4.addText(secTitle, { x: pos.x + 0.12, y: pos.y + 0.08, w: w - 0.24, h: 0.3, fontSize: 11, bold: true, color: accentColors[i], fontFace: 'Calibri', margin: 0 })
      const bodyText = sec.body.slice(0, 320)
      s4.addText(bodyText, { x: pos.x + 0.12, y: pos.y + 0.42, w: w - 0.24, h: h - 0.55, fontSize: 10, color: C.textMid, fontFace: 'Calibri', wrap: true, valign: 'top', margin: 0 })
    })

    s4.addText('All statistics quoted directly from R output — none estimated or fabricated by AI', {
      x: 0.3, y: 5.3, w: 9.4, h: 0.25, fontSize: 8, color: C.dim, align: 'center', italic: true, fontFace: 'Calibri', margin: 0,
    })
    s4.addNotes(`AI interpretation based on R output.\n${aiInterpretation.slice(0, 600)}`)

    // ── SLIDE 5: RECOMMENDATIONS (if any) ──────────────────────────────────
    if (recommendations.length > 0) {
      const s5 = pres.addSlide()
      s5.background = { color: C.navy }

      s5.addShape(SH.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: C.green, transparency: 15 }, line: { color: C.green } })
      s5.addText('Recommendations', { x: 0.45, y: 0, w: 9, h: 0.75, fontSize: 28, bold: true, color: C.white, fontFace: 'Cambria', valign: 'middle', margin: 0 })

      const catColors = [C.violet, C.blue, C.gold, C.green, 'E879F9']
      const catLabels = ['Immediate Control', 'Surveillance', 'Investigation', 'Prevention', 'Laboratory']
      let ry = 0.9

      recommendations.forEach((rec, i) => {
        if (ry > 5.0) return
        const cc = catColors[i % 5]
        const cardH = rec.length > 160 ? 0.88 : 0.72
        s5.addShape(SH.ROUNDED_RECTANGLE, { x: 0.4, y: ry, w: 9.2, h: cardH, fill: { color: C.navyMid }, line: { color: cc }, rectRadius: 0.08 })
        s5.addShape(SH.ROUNDED_RECTANGLE, { x: 0.4, y: ry, w: 1.7, h: cardH, fill: { color: cc, transparency: 65 }, line: { color: cc }, rectRadius: 0.08 })
        s5.addText(catLabels[i] || `Step ${i + 1}`, { x: 0.4, y: ry, w: 1.7, h: cardH, fontSize: 8, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', wrap: true, margin: 0 })
        const recText = rec.slice(0, 220)
        s5.addText(recText, { x: 2.2, y: ry + 0.06, w: 7.2, h: cardH - 0.12, fontSize: 11, color: 'D1D9F0', fontFace: 'Calibri', valign: 'middle', wrap: true, margin: 0 })
        ry += cardH + 0.1
      })

      s5.addNotes(`Recommendations:\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`)
    }

    // ── SLIDE 6: REFERENCES ─────────────────────────────────────────────────
    const s6 = pres.addSlide()
    s6.background = { color: C.light }

    s6.addShape(SH.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: C.navy }, line: { color: C.navy } })
    s6.addText('References & Attribution', { x: 0.45, y: 0, w: 9, h: 0.75, fontSize: 22, bold: true, color: C.white, fontFace: 'Cambria', valign: 'middle', margin: 0 })

    const refs = [
      { tag: 'EpiR', text: 'Batra N, et al. (2021). The Epidemiologist R Handbook. epirhandbook.com', color: C.violet },
      { tag: 'WHO',  text: 'World Health Organization. (2020). Investigating and Controlling Disease Outbreaks: A Field Manual.', color: C.blue },
      { tag: 'CDC',  text: 'Centers for Disease Control. (2012). Principles of Epidemiology in Public Health Practice, 3rd ed.', color: 'DC2626' },
      { tag: 'DOH',  text: 'Philippine DOH. (2022). PIDSR Operations Manual. epidemiology.doh.gov.ph', color: C.gold },
      { tag: 'R',    text: 'R Core Team (2024). R: A Language and Environment for Statistical Computing. r-project.org', color: '16A34A' },
    ]

    let ry = 0.9
    refs.forEach(ref => {
      s6.addShape(SH.ROUNDED_RECTANGLE, { x: 0.4, y: ry, w: 0.7, h: 0.42, fill: { color: ref.color, transparency: 70 }, line: { color: ref.color }, rectRadius: 0.06 })
      s6.addText(ref.tag, { x: 0.4, y: ry, w: 0.7, h: 0.42, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0 })
      s6.addText(ref.text, { x: 1.2, y: ry + 0.02, w: 8.5, h: 0.38, fontSize: 11, color: C.text, fontFace: 'Calibri', valign: 'middle', margin: 0 })
      ry += 0.56
    })

    // Attribution box
    s6.addShape(SH.ROUNDED_RECTANGLE, { x: 0.4, y: 4.55, w: 9.2, h: 0.65, fill: { color: C.violet, transparency: 90 }, line: { color: C.violet }, rectRadius: 0.1 })
    s6.addText(
      `Analyzed with JOANResearchOS · ${testLabel} · ${today}\nR 4.4.1 (statistical engine) · Claude by Anthropic (AI interpretation) · All statistics computed by R`,
      { x: 0.5, y: 4.6, w: 9, h: 0.55, fontSize: 9, color: C.textMid, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true, margin: 0 }
    )

    // Write
    const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="JOANResearchOS_${plan.selectedTest}_${Date.now()}.pptx"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PowerPoint generation failed.'
    console.error('[generate-pptx]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
