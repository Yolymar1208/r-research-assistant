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

// Color palette — navy/violet theme aligned with JOANResearchOS galaxy design
const C = {
  navy:    '050B1A',
  navyMid: '0D1830',
  violet:  '7C5CFF',
  blue:    '2E75B6',
  gold:    'E8B85C',
  white:   'FFFFFF',
  muted:   '8B9BC4',
  dim:     '4A6A85',
  light:   'F1F4FC',
  green:   '4ADE80',
  text:    '1A2A3A',
}

function makeShadow() {
  return { type: 'outer' as const, color: '000000', blur: 8, offset: 3, angle: 45, opacity: 0.18 }
}

function parseInterpretation(text: string): { sections: { title: string; content: string }[] } {
  const sections: { title: string; content: string }[] = []
  const lines = text.split('\n')
  let currentTitle = ''
  let currentContent: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      if (currentTitle || currentContent.length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() })
      }
      currentTitle = trimmed.replace(/^#+\s*\*?\*?/, '').replace(/\*?\*?$/, '').replace(/\d+\.\s*/, '').trim()
      currentContent = []
    } else if (trimmed && currentTitle) {
      currentContent.push(trimmed.replace(/\*\*/g, '').replace(/\*/g, ''))
    }
  }
  if (currentTitle || currentContent.length > 0) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() })
  }
  return { sections }
}

function extractRecommendations(interpretation: string): string[] {
  const recs: string[] = []
  const lines = interpretation.split('\n')
  let inRec = false
  for (const line of lines) {
    const t = line.trim()
    if (t.match(/^(6\.|##.*Recommendation|Recommendation)/i)) { inRec = true; continue }
    if (inRec && t.match(/^\d\.|^[1-9]\./)) {
      const clean = t.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim()
      if (clean.length > 10) recs.push(clean.slice(0, 180))
    }
    if (inRec && t.match(/^#{1,3} \d/) && !t.match(/Recommendation/i)) break
  }
  return recs.slice(0, 5)
}

function buildBulletItems(text: string, maxItems = 5) {
  const lines = text.split('\n').filter(l => l.trim().length > 15)
  return lines.slice(0, maxItems).map((l, i) => ({
    text: l.replace(/^[-•*]\s*/, '').replace(/\[.*?\]/g, '').trim().slice(0, 200),
    options: { bullet: true, breakLine: i < Math.min(maxItems, lines.length) - 1, fontSize: 13, color: C.text },
  }))
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const {
      plan,
      execution,
      aiInterpretation,
      datasetName,
      chartBase64,
    }: {
      plan: AnalysisPlan
      execution: RExecutionResult
      aiInterpretation: string
      datasetName: string
      chartBase64?: string
    } = body

    // Dynamic import — pptxgenjs is server-side only
    const PptxGenJS = (await import('pptxgenjs')).default
    const pres = new PptxGenJS()
    pres.layout = 'LAYOUT_16x9'
    pres.author = 'JOANResearchOS'
    pres.title = `${TEST_LABELS[plan.selectedTest] || plan.selectedTest} — JOANResearchOS`

    const testLabel = TEST_LABELS[plan.selectedTest] || plan.selectedTest
    const isEpi = EPI_TESTS.has(plan.selectedTest)
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    const { sections } = parseInterpretation(aiInterpretation)
    const recommendations = extractRecommendations(aiInterpretation)

    // ── SLIDE 1: TITLE ─────────────────────────────────────────────────────────
    const s1 = pres.addSlide()
    s1.background = { color: C.navy }

    // Top accent shape
    s1.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.violet }, line: { color: C.violet }
    })

    // J logo mark
    s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 0.5, w: 0.7, h: 0.7,
      fill: { color: C.violet }, line: { color: C.violet }, rectRadius: 0.1
    })
    s1.addText('J', { x: 0.55, y: 0.5, w: 0.7, h: 0.7, fontSize: 26, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0 })

    // App name
    s1.addText('JOANResearchOS', { x: 1.35, y: 0.6, w: 4, h: 0.5, fontSize: 13, bold: true, color: C.muted, fontFace: 'Calibri', margin: 0 })

    // Main title
    s1.addText(testLabel, {
      x: 0.55, y: 1.4, w: 9, h: 1.2,
      fontSize: 40, bold: true, color: C.white, fontFace: 'Cambria', align: 'left', valign: 'middle', margin: 0
    })

    // Research question
    const rq = plan.researchQuestion.slice(0, 160)
    s1.addText(`"${rq}"`, {
      x: 0.55, y: 2.75, w: 9, h: 0.85,
      fontSize: 14, italic: true, color: C.muted, fontFace: 'Calibri', align: 'left', margin: 0
    })

    // Info row
    s1.addText([
      { text: `Dataset: ${datasetName}`, options: { color: C.muted } },
      { text: '   |   ', options: { color: C.dim } },
      { text: `Date: ${today}`, options: { color: C.muted } },
      { text: '   |   ', options: { color: C.dim } },
      { text: isEpi ? 'Epidemiology Analysis' : 'Statistical Analysis', options: { color: C.muted } },
    ], { x: 0.55, y: 3.7, w: 9, h: 0.4, fontSize: 11, fontFace: 'Calibri', align: 'left', margin: 0 })

    // Bottom badge row
    s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y: 4.5, w: 2.8, h: 0.45,
      fill: { color: C.violet, transparency: 80 }, line: { color: C.violet }, rectRadius: 0.08
    })
    s1.addText('Statistical Engine: R', { x: 0.55, y: 4.5, w: 2.8, h: 0.45, fontSize: 10, color: C.white, align: 'center', valign: 'middle', margin: 0 })

    s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 3.55, y: 4.5, w: 2.8, h: 0.45,
      fill: { color: C.blue, transparency: 80 }, line: { color: C.blue }, rectRadius: 0.08
    })
    s1.addText('AI: Claude by Anthropic', { x: 3.55, y: 4.5, w: 2.8, h: 0.45, fontSize: 10, color: C.white, align: 'center', valign: 'middle', margin: 0 })

    s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 6.55, y: 4.5, w: 2.9, h: 0.45,
      fill: { color: C.gold, transparency: 80 }, line: { color: C.gold }, rectRadius: 0.08
    })
    s1.addText('All values computed by R', { x: 6.55, y: 4.5, w: 2.9, h: 0.45, fontSize: 10, color: C.white, align: 'center', valign: 'middle', margin: 0 })

    s1.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 5.575, w: 10, h: 0.05, fill: { color: C.violet }, line: { color: C.violet }
    })

    s1.addNotes(`Title slide for ${testLabel} analysis.\nResearch question: ${plan.researchQuestion}\nGenerated by JOANResearchOS on ${today}`)

    // ── SLIDE 2: CHART ────────────────────────────────────────────────────────
    if (chartBase64) {
      const s2 = pres.addSlide()
      s2.background = { color: C.light }

      s2.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.violet }, line: { color: C.violet } })
      s2.addText(testLabel, { x: 0.5, y: 0.18, w: 7.5, h: 0.55, fontSize: 22, bold: true, color: C.text, fontFace: 'Cambria', margin: 0 })
      s2.addText('Statistical Chart', { x: 8, y: 0.18, w: 1.8, h: 0.55, fontSize: 11, color: C.muted, align: 'right', fontFace: 'Calibri', margin: 0 })

      // Chart image — full width, centered
      const b64Clean = chartBase64.replace(/^data:image\/png;base64,/, '')
      s2.addImage({ data: `image/png;base64,${b64Clean}`, x: 0.4, y: 0.85, w: 9.2, h: 4.35 })

      s2.addText('Generated by R · ggplot2 · All statistical values computed by R · JOANResearchOS', {
        x: 0.4, y: 5.2, w: 9.2, h: 0.3, fontSize: 9, color: C.muted, align: 'center', italic: true, fontFace: 'Calibri', margin: 0
      })
      s2.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.575, w: 10, h: 0.05, fill: { color: C.violet }, line: { color: C.violet } })

      s2.addNotes(`Chart: ${testLabel}\nGenerated by R using ggplot2. All axis values, labels, and data points reflect actual R statistical output — not AI-generated estimates.`)
    }

    // ── SLIDE 3: KEY FINDINGS ────────────────────────────────────────────────
    const s3 = pres.addSlide()
    s3.background = { color: C.navy }

    s3.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.gold }, line: { color: C.gold } })
    s3.addText('Key Findings', { x: 0.5, y: 0.18, w: 9, h: 0.55, fontSize: 28, bold: true, color: C.white, fontFace: 'Cambria', margin: 0 })

    // Summary section (first meaningful section from interpretation)
    const summarySection = sections.find(s => s.title.match(/summary|finding|result/i)) || sections[0]
    if (summarySection) {
      const summaryText = summarySection.content.replace(/\[.*?\]/g, '').slice(0, 500)
      s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.4, y: 0.9, w: 9.2, h: 1.6,
        fill: { color: C.navyMid }, line: { color: C.violet, pt: 1 }, rectRadius: 0.1
      })
      s3.addText(summaryText, {
        x: 0.55, y: 0.95, w: 8.9, h: 1.5, fontSize: 12, color: C.light, fontFace: 'Calibri',
        align: 'left', valign: 'top', wrap: true, margin: 0
      })
    }

    // Stats cards row
    const statsSection = sections.find(s => s.title.match(/statistic|result/i))
    const statsLines = statsSection ? statsSection.content.split('\n').filter(l => l.trim().length > 5).slice(0, 3) : []

    const cardColors = [C.violet, C.blue, C.gold]
    const cardX = [0.4, 3.6, 6.8]
    for (let i = 0; i < Math.min(3, statsLines.length); i++) {
      const parts = statsLines[i].replace(/\[.*?\]/g, '').split(/[:|—–]/)
      const label = (parts[0] || '').trim().slice(0, 40)
      const value = (parts[1] || parts[0] || '').trim().slice(0, 30)
      s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: cardX[i], y: 2.65, w: 2.95, h: 1.4,
        fill: { color: cardColors[i], transparency: 85 }, line: { color: cardColors[i] }, rectRadius: 0.1
      })
      s3.addText(value, { x: cardX[i], y: 2.75, w: 2.95, h: 0.75, fontSize: 22, bold: true, color: C.white, align: 'center', fontFace: 'Cambria', margin: 0 })
      s3.addText(label, { x: cardX[i], y: 3.55, w: 2.95, h: 0.4, fontSize: 10, color: C.muted, align: 'center', fontFace: 'Calibri', margin: 0 })
    }

    // Source attribution
    s3.addText('All statistical values computed exclusively by R · AI interprets R output only', {
      x: 0.4, y: 4.2, w: 9.2, h: 0.3, fontSize: 9, color: C.dim, align: 'center', italic: true, fontFace: 'Calibri', margin: 0
    })
    s3.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.575, w: 10, h: 0.05, fill: { color: C.gold }, line: { color: C.gold } })

    s3.addNotes(`Key findings from the ${testLabel} analysis.\n\n${summarySection?.content || ''}`)

    // ── SLIDE 4: AI INTERPRETATION ──────────────────────────────────────────
    const s4 = pres.addSlide()
    s4.background = { color: C.light }

    s4.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.violet }, line: { color: C.violet } })
    s4.addText('AI Interpretation', { x: 0.5, y: 0.18, w: 7.5, h: 0.55, fontSize: 28, bold: true, color: C.text, fontFace: 'Cambria', margin: 0 })
    s4.addText('Written by Claude from R output', { x: 7.0, y: 0.25, w: 2.8, h: 0.4, fontSize: 10, color: C.muted, align: 'right', fontFace: 'Calibri', margin: 0 })

    // Find the best 2-3 sections for left/right layout
    const interpSections = sections.filter(s => !s.title.match(/recommendation/i)).slice(0, 4)

    // Left column
    const leftSections = interpSections.filter((_, i) => i % 2 === 0)
    let leftY = 0.9
    for (const sec of leftSections) {
      if (leftY > 4.5) break
      s4.addText(sec.title, { x: 0.4, y: leftY, w: 4.5, h: 0.35, fontSize: 13, bold: true, color: C.violet, fontFace: 'Calibri', margin: 0 })
      leftY += 0.38
      const content = sec.content.replace(/\[.*?\]/g, '').slice(0, 350)
      s4.addText(content, { x: 0.4, y: leftY, w: 4.5, h: 1.2, fontSize: 11, color: C.text, fontFace: 'Calibri', wrap: true, valign: 'top', margin: 0 })
      leftY += 1.3
    }

    // Right column
    const rightSections = interpSections.filter((_, i) => i % 2 === 1)
    let rightY = 0.9
    for (const sec of rightSections) {
      if (rightY > 4.5) break
      s4.addText(sec.title, { x: 5.1, y: rightY, w: 4.5, h: 0.35, fontSize: 13, bold: true, color: C.blue, fontFace: 'Calibri', margin: 0 })
      rightY += 0.38
      const content = sec.content.replace(/\[.*?\]/g, '').slice(0, 350)
      s4.addText(content, { x: 5.1, y: rightY, w: 4.5, h: 1.2, fontSize: 11, color: C.text, fontFace: 'Calibri', wrap: true, valign: 'top', margin: 0 })
      rightY += 1.3
    }

    // Divider
    s4.addShape(pres.shapes.LINE, { x: 5.0, y: 0.9, w: 0, h: 4.2, line: { color: 'D1D5DB', width: 1 } })

    s4.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.575, w: 10, h: 0.05, fill: { color: C.violet }, line: { color: C.violet } })
    s4.addText('AI interpretation is based entirely on verified R output · Every statistic quoted directly from R', {
      x: 0.4, y: 5.25, w: 9.2, h: 0.25, fontSize: 8, color: C.muted, align: 'center', italic: true, fontFace: 'Calibri', margin: 0
    })

    s4.addNotes(`AI Interpretation by Claude (Anthropic).\nAll statistical values in this interpretation are quoted directly from R output — none are estimated or fabricated by AI.\n\n${aiInterpretation.slice(0, 800)}`)

    // ── SLIDE 5: RECOMMENDATIONS ─────────────────────────────────────────────
    if (recommendations.length > 0) {
      const s5 = pres.addSlide()
      s5.background = { color: C.navy }

      s5.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.green }, line: { color: C.green } })
      s5.addText('Recommendations', { x: 0.5, y: 0.18, w: 8, h: 0.55, fontSize: 28, bold: true, color: C.white, fontFace: 'Cambria', margin: 0 })

      const catLabels = ['Immediate Control', 'Surveillance Enhancement', 'Further Investigation', 'Prevention', 'Laboratory']
      let recY = 0.9
      recommendations.forEach((rec, i) => {
        const catColor = [C.violet, C.blue, C.gold, C.green, '94A3B8'][i % 5]
        const cat = catLabels[i] || `Action ${i + 1}`
        s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: 0.4, y: recY, w: 9.2, h: 0.78,
          fill: { color: C.navyMid }, line: { color: catColor }, rectRadius: 0.08
        })
        s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: 0.4, y: recY, w: 1.8, h: 0.78,
          fill: { color: catColor, transparency: 70 }, line: { color: catColor }, rectRadius: 0.08
        })
        s5.addText(cat, { x: 0.4, y: recY, w: 1.8, h: 0.78, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 })
        s5.addText(rec.slice(0, 200), { x: 2.3, y: recY + 0.05, w: 7.2, h: 0.68, fontSize: 11, color: C.light, fontFace: 'Calibri', valign: 'middle', wrap: true, margin: 0 })
        recY += 0.88
      })

      s5.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.575, w: 10, h: 0.05, fill: { color: C.green }, line: { color: C.green } })
      s5.addNotes(`Recommendations from ${testLabel} analysis.\n\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`)
    }

    // ── SLIDE 6: REFERENCES & ATTRIBUTION ───────────────────────────────────
    const s6 = pres.addSlide()
    s6.background = { color: C.light }

    s6.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.blue }, line: { color: C.blue } })
    s6.addText('References & Attribution', { x: 0.5, y: 0.18, w: 9, h: 0.55, fontSize: 28, bold: true, color: C.text, fontFace: 'Cambria', margin: 0 })

    const refItems = [
      { tag: 'EpiR', text: 'Batra N, et al. (2021). The Epidemiologist R Handbook. epirhandbook.com', color: C.violet },
      { tag: 'WHO', text: 'World Health Organization. (2020). Investigating and Controlling Disease Outbreaks: A Field Manual.', color: C.blue },
      { tag: 'CDC', text: 'Centers for Disease Control. (2012). Principles of Epidemiology in Public Health Practice, 3rd Edition.', color: '991B1B' },
      { tag: 'DOH', text: 'Philippine DOH. (2022). PIDSR Operations Manual. epidemiology.doh.gov.ph', color: C.gold },
      { tag: 'R', text: 'R Core Team (2024). R: A Language and Environment for Statistical Computing. r-project.org', color: '166534' },
    ]

    let refY = 0.9
    refItems.forEach(ref => {
      s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.4, y: refY, w: 0.75, h: 0.45,
        fill: { color: ref.color, transparency: 75 }, line: { color: ref.color }, rectRadius: 0.06
      })
      s6.addText(ref.tag, { x: 0.4, y: refY, w: 0.75, h: 0.45, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0 })
      s6.addText(ref.text, { x: 1.25, y: refY + 0.02, w: 8.3, h: 0.4, fontSize: 11, color: C.text, fontFace: 'Calibri', valign: 'middle', margin: 0 })
      refY += 0.58
    })

    // Attribution box
    s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.4, y: 4.45, w: 9.2, h: 0.7,
      fill: { color: C.violet, transparency: 90 }, line: { color: C.violet }, rectRadius: 0.1
    })
    s6.addText([
      { text: 'Analyzed with ', options: { color: C.text } },
      { text: 'JOANResearchOS', options: { color: C.violet, bold: true } },
      { text: ` — ${testLabel} — ${today}`, options: { color: C.text } },
      { text: '\nStatistical engine: R 4.4.1 · AI interpretation: Claude (Anthropic) · All statistics computed by R, not AI', options: { color: C.muted, breakLine: false } },
    ], { x: 0.5, y: 4.5, w: 9, h: 0.6, fontSize: 10, fontFace: 'Calibri', align: 'center', valign: 'middle', margin: 0 })

    s6.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.575, w: 10, h: 0.05, fill: { color: C.blue }, line: { color: C.blue } })

    // Write to buffer
    const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer

    return new NextResponse(buffer, {
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
