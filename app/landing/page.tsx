'use client'

import { useState } from 'react'

const APP_URL = 'https://r-research-assistant-vx33.vercel.app'
const CONTACT_EMAIL = 'yolymarorfiano@yahoo.com'

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const C = {
    navy: '#05070f',
    navyMid: '#0d1830',
    navyLight: '#1a3a5c',
    blue: '#2e75b6',
    violet: '#7c5cff',
    gold: '#e8b85c',
    starBlue: '#60a5fa',
    text: '#f1f4fc',
    muted: '#8b9bc4',
    dim: '#4a6a85',
  }

  const glass = (border = C.violet, alpha = 0.15) => ({
    background: `rgba(13,24,48,${alpha + 0.5})`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid rgba(124,92,255,${alpha + 0.1})`,
    borderColor: border === C.violet ? `rgba(124,92,255,${alpha + 0.1})` : `rgba(46,117,182,${alpha + 0.1})`,
  })

  return (
    <main style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.text, background: C.navy, overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,7,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(124,92,255,0.15)', padding: '0 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`, boxShadow: `0 0 0 1px rgba(124,92,255,0.4), 0 4px 14px rgba(124,92,255,0.3)` }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>J</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: '17px', color: C.text, fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.3px' }}>JOANResearchOS</span>
          </div>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              {[['#epi', 'For Epi'], ['#linelist', 'Line List Builder'], ['#tests', '19 Tests'], ['#pricing', 'Pricing']].map(([href, label]) => (
                <a key={href} href={href} style={{ color: C.muted, textDecoration: 'none', fontSize: '14px', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                  {label}
                </a>
              ))}
            </div>
            <a href={`${APP_URL}/login`} style={{ color: C.muted, textDecoration: 'none', fontSize: '14px' }}>Sign in</a>
            <a href={APP_URL} target="_blank" rel="noreferrer" style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`, color: '#fff', padding: '9px 20px', borderRadius: '9px', textDecoration: 'none', fontSize: '14px', fontWeight: 700, boxShadow: '0 4px 14px rgba(124,92,255,0.35)' }}>
              Try free →
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', padding: '120px 2rem 100px', overflow: 'hidden', background: `radial-gradient(ellipse at top, ${C.navyMid} 0%, ${C.navy} 60%)` }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', top: '-200px', left: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: C.violet, filter: 'blur(140px)', opacity: 0.12, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-200px', right: '-200px', width: '500px', height: '500px', borderRadius: '50%', background: C.blue, filter: 'blur(120px)', opacity: 0.12, pointerEvents: 'none' }} />

        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          {/* New badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `rgba(232,184,92,0.12)`, border: `1px solid rgba(232,184,92,0.35)`, color: C.gold, fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', marginBottom: '28px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.gold, display: 'inline-block' }} />
            New: Line List Builder — clean KoboToolbox &amp; PIDSR data in minutes
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 62px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-1.5px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>
            You understand the statistics.<br />
            <span style={{ background: `linear-gradient(135deg, ${C.starBlue}, ${C.violet})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              We handle the R.
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: C.muted, lineHeight: 1.7, maxWidth: '680px', margin: '0 auto 40px' }}>
            JOANResearchOS runs epidemic curves, attack rate tables, survival analysis, and 16 other tests — just by describing your research question. AI generates the code. R computes every value. You get a DOH-ready PDF report.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '56px' }}>
            <a href={APP_URL} target="_blank" rel="noreferrer" style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`, color: '#fff', padding: '15px 36px', borderRadius: '12px', textDecoration: 'none', fontSize: '16px', fontWeight: 800, boxShadow: '0 6px 24px rgba(124,92,255,0.4)' }}>
              Start analyzing free
            </a>
            <a href="#epi" style={{ background: 'rgba(255,255,255,0.06)', color: C.text, padding: '15px 28px', borderRadius: '12px', textDecoration: 'none', fontSize: '16px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.14)' }}>
              See epi features →
            </a>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
            {[
              { value: '19', label: 'Statistical tests' },
              { value: '100%', label: 'R-computed values' },
              { value: 'DOH', label: 'Report-ready output' },
              { value: '₱0', label: 'To start' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: C.starBlue, fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.5px' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: C.dim, marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <div style={{ background: `linear-gradient(90deg, ${C.violet}22, ${C.blue}33, ${C.violet}22)`, borderTop: `1px solid rgba(124,92,255,0.2)`, borderBottom: `1px solid rgba(124,92,255,0.2)`, padding: '14px 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'center', gap: '36px', flexWrap: 'wrap' }}>
          {['R computes all values', 'AI never fabricates numbers', 'Epidemic curves built-in', 'DOH/WHO PDF reports', 'PIDSR-compatible', 'KoboToolbox cleaner'].map(t => (
            <div key={t} style={{ color: C.muted, fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: C.violet, fontWeight: 700 }}>✓</span> {t}
            </div>
          ))}
        </div>
      </div>

      {/* ── LINE LIST BUILDER (NEW) ── */}
      <section style={{ padding: '100px 2rem', background: C.navyMid, position: 'relative' }} id="linelist">
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '800px', height: '400px', background: C.gold, filter: 'blur(180px)', opacity: 0.04, pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '64px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `rgba(232,184,92,0.1)`, border: `1px solid rgba(232,184,92,0.3)`, color: C.gold, fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '14px', marginBottom: '20px' }}>
                ✦ New Feature
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: '20px', fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.5px' }}>
                Line List Builder
              </h2>
              <p style={{ fontSize: '17px', color: C.muted, lineHeight: 1.7, marginBottom: '28px' }}>
                Transform raw KoboToolbox exports, PIDSR data, Google Forms, and hospital EMR files into clean, de-identified WHO-standard line lists — directly in your browser.
              </p>
              <p style={{ fontSize: '14px', color: C.dim, lineHeight: 1.6, marginBottom: '32px' }}>
                PHI never leaves your device. All cleaning happens client-side. Only the de-identified output uploads to JOANResearchOS.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a href={`${APP_URL}/clean`} target="_blank" rel="noreferrer" style={{ background: `linear-gradient(135deg, ${C.gold}dd, #d4914a)`, color: '#1a0a00', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 800 }}>
                  🧹 Try Line List Builder
                </a>
                <a href="#epi" style={{ color: C.muted, fontSize: '14px', textDecoration: 'none', padding: '12px 0', fontWeight: 600 }}>
                  See epi features →
                </a>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { src: 'KoboToolbox / ODK', icon: '📋', desc: 'Auto-strips _uuid, _submission_time, GPS columns. Detects source on upload.' },
                { src: 'PIDSR Export', icon: '🏥', desc: 'Maps PIDSR columns to WHO line list standard. Philippine-specific field recognition.' },
                { src: 'Google Forms', icon: '📝', desc: 'Removes Timestamp, Email Address. Renames Q-prefixed columns automatically.' },
                { src: 'Hospital EMR / HEIS', icon: '💊', desc: 'Strips PatientID, MRN, encounter metadata. Keeps clinical analysis fields.' },
              ].map(s => (
                <div key={s.src} style={{ ...glass(), padding: '16px 20px', borderRadius: '12px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>{s.icon}</span>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px', color: C.text }}>{s.src}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── EPI FEATURES ── */}
      <section style={{ padding: '100px 2rem', background: C.navy }} id="epi">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(96,165,250,0.12)', color: C.starBlue, fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', marginBottom: '16px', border: '1px solid rgba(96,165,250,0.25)' }}>
              Epidemiology-specific features
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#fff', marginBottom: '16px', fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.5px' }}>
              Built for outbreak investigation and surveillance
            </h2>
            <p style={{ fontSize: '18px', color: C.muted, lineHeight: 1.6, maxWidth: '640px', margin: '0 auto' }}>
              The EpiR Handbook is used by 850,000 epidemiologists worldwide. JOANResearchOS makes every chapter accessible without writing a single line of code.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[
              { icon: '📈', title: 'Epidemic Curves', ref: 'EpiR Ch. 32', desc: 'Auto-generates epicurves from case line lists. Selects daily, weekly, or monthly intervals. Identifies peak period and case counts.', tags: ['Date of onset', 'Auto-interval', 'Peak detection'] },
              { icon: '⚔️', title: 'Attack Rate Tables', ref: 'EpiR Ch. 16', desc: 'Standard 2×2 outbreak tables. Calculates attack rates, Risk Ratio, Odds Ratio, Attributable Risk, and Population Attributable Risk.', tags: ['Risk Ratio', 'Odds Ratio', 'Attributable Risk'] },
              { icon: '🔺', title: 'Age-Sex Pyramids', ref: 'EpiR Ch. 33', desc: 'Demographic breakdown of cases. Auto-bins numeric ages into standard epi groups (0–4, 5–9... 75+). Median and mean age by sex.', tags: ['Standard age groups', 'Sex breakdown', 'Proportions'] },
              { icon: '⏱️', title: 'Survival Analysis', ref: 'EpiR Ch. 27', desc: 'Kaplan-Meier curves, CFR, and median survival time from symptom onset to outcome. Stratified by vaccination, severity, or comorbidities.', tags: ['CFR', 'Kaplan-Meier', 'Cox regression'] },
              { icon: '📉', title: 'Moving Averages', ref: 'EpiR Ch. 22', desc: '7-day rolling averages to smooth surveillance noise. Detects peak timing, trend direction, and weekly totals for situational reports.', tags: ['7-day MA', 'Trend detection', 'Weekly totals'] },
              { icon: '📊', title: '14 More Tests', ref: 'All auto-selected', desc: "Chi-square, Fisher's Exact, logistic regression, Mann-Whitney, Kruskal-Wallis, t-tests, ANOVA, correlations — triggered by plain-language questions.", tags: ['Auto selection', 'Effect sizes', 'Assumptions checked'] },
            ].map(f => (
              <div key={f.title} style={{ ...glass(), borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'border-color 0.2s' }}>
                <div style={{ fontSize: '36px' }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '17px', marginBottom: '4px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>{f.title}</div>
                  <div style={{ fontSize: '11px', color: C.violet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.ref}</div>
                </div>
                <div style={{ color: C.muted, fontSize: '14px', lineHeight: 1.6, flex: 1 }}>{f.desc}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {f.tags.map(t => (
                    <span key={t} style={{ background: 'rgba(96,165,250,0.1)', color: C.starBlue, fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '10px', border: '1px solid rgba(96,165,250,0.2)' }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px 2rem', background: C.navyMid }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#fff', marginBottom: '12px', fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.5px' }}>
              From case line list to outbreak report
            </h2>
            <p style={{ fontSize: '18px', color: C.muted }}>No R installation. No coding. No waiting for a statistician.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { n: '01', title: 'Clean your raw data (optional)', desc: 'Use the Line List Builder to clean KoboToolbox, PIDSR, or Google Forms exports. PHI detection, date standardization, and de-identification — all in your browser.', color: C.gold, isNew: true },
              { n: '02', title: 'Upload your Excel case line list', desc: 'Drag and drop your .xlsx file. AI detects column types, flags missing values, and runs pre-flight assumption checks before you spend an analysis credit.', color: C.starBlue },
              { n: '03', title: 'Describe your investigation question', desc: '"What is the epidemic curve by symptom onset?" or "What is the attack rate among vaccinated vs unvaccinated cases?" Plain language — no syntax required.', color: '#a78bfa' },
              { n: '04', title: 'AI selects the test and writes R code', desc: 'JOANResearchOS selects the appropriate test, generates the R script, and shows you a pre-flight assumption check before executing.', color: '#34d399' },
              { n: '05', title: 'R computes every value', desc: 'Every attack rate, risk ratio, p-value, and confidence interval is computed by R — not estimated or fabricated by AI. Full audit trail included.', color: '#f472b6' },
              { n: '06', title: 'Download your DOH-ready PDF report', desc: 'Professional report with your analysis plan, full R output, AI interpretation, and the complete R script for reproducibility. Ready for DOH, WHO, or ethics boards.', color: C.violet },
            ].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', gap: '20px', padding: '28px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${s.color}18`, border: `1px solid ${s.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px', color: s.color, fontFamily: 'var(--font-space-grotesk), system-ui' }}>{s.n}</div>
                  {i < 5 && <div style={{ width: '1px', flex: 1, minHeight: '24px', marginTop: '8px', background: 'rgba(255,255,255,0.07)' }} />}
                </div>
                <div style={{ flex: 1, paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800, fontSize: '17px', color: '#fff', fontFamily: 'var(--font-space-grotesk), system-ui' }}>{s.title}</div>
                    {s.isNew && <span style={{ fontSize: '11px', fontWeight: 700, color: C.gold, background: 'rgba(232,184,92,0.12)', border: '1px solid rgba(232,184,92,0.3)', padding: '2px 8px', borderRadius: '8px' }}>NEW</span>}
                  </div>
                  <div style={{ color: C.muted, fontSize: '15px', lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section style={{ padding: '100px 2rem', background: C.navy }} id="trust">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#fff', marginBottom: '16px', fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.5px' }}>
              Results you can publish, present, and defend
            </h2>
            <p style={{ fontSize: '18px', color: C.muted, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              Every design decision was made with one goal: statistical output that meets academic and public health reporting standards.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { icon: '🔬', title: 'R is the only calculator', desc: 'AI never estimates or computes statistical values. Every p-value, confidence interval, risk ratio, and effect size comes exclusively from R — the gold standard used by WHO, CDC, and Philippine DOH.' },
              { icon: '📋', title: 'Full audit trail', desc: 'Every analysis includes the complete R script and verbatim R console output. Any biostatistician can re-run it independently and get identical results. Perfect for DOH and ethics board submissions.' },
              { icon: '🏥', title: 'DOH and WHO aligned', desc: 'Output format follows standard epidemiological reporting conventions. Attack rate tables, epicurves, and survival analyses match what PIDSR, WHO surveillance reports, and outbreak investigations require.' },
            ].map(t => (
              <div key={t.title} style={{ ...glass(C.blue), borderRadius: '16px', padding: '32px' }}>
                <div style={{ fontSize: '36px', marginBottom: '20px' }}>{t.icon}</div>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '17px', marginBottom: '12px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>{t.title}</div>
                <div style={{ color: C.muted, fontSize: '14px', lineHeight: 1.7 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 19 TESTS ── */}
      <section style={{ padding: '80px 2rem', background: C.navyMid }} id="tests">
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: '#fff', marginBottom: '48px', fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.5px' }}>
            19 statistical tests — automatically selected
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {([
              ['Parametric', ['Descriptive Statistics', 'Independent t-test', 'Paired t-test', 'One-Way ANOVA', 'Chi-Square Test', 'Pearson Correlation'], C.starBlue],
              ['Non-Parametric', ['Mann-Whitney U', 'Wilcoxon Signed-Rank', 'Kruskal-Wallis', 'Spearman Correlation', "Fisher's Exact Test", "McNemar's Test"], '#a78bfa'],
              ['Regression', ['Logistic Regression', 'Linear Regression'], '#34d399'],
              ['Epidemiology', ['Epidemic Curve', 'Attack Rate Table', 'Age-Sex Pyramid', 'Survival Analysis', 'Moving Average'], C.violet],
            ] as [string, string[], string][]).map(([group, tests, accent]) => (
              <div key={group} style={{ background: group === 'Epidemiology' ? `linear-gradient(135deg, rgba(124,92,255,0.25), rgba(46,117,182,0.2))` : 'rgba(255,255,255,0.03)', border: `1px solid ${accent}33`, borderRadius: '12px', padding: '20px', textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: accent, marginBottom: '14px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>{group}</div>
                {tests.map(t => (
                  <div key={t} style={{ fontSize: '13px', color: group === 'Epidemiology' ? '#e2eaf2' : C.muted, padding: '5px 0', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: accent, fontWeight: 700, fontSize: '11px' }}>✓</span> {t}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: '100px 2rem', background: C.navy }} id="pricing">
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(124,92,255,0.12)', color: C.violet, fontSize: '12px', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', marginBottom: '16px', border: '1px solid rgba(124,92,255,0.25)' }}>
            Simple, transparent pricing
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#fff', marginBottom: '12px', fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.5px' }}>
            Start free. Scale as you grow.
          </h2>
          <p style={{ fontSize: '18px', color: C.muted, marginBottom: '64px' }}>
            Pay via GCash or bank transfer — no credit card required, ever.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', textAlign: 'left', alignItems: 'start' }}>

            {/* FREE */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>Free</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontSize: '44px', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-space-grotesk), system-ui' }}>₱0</span>
                <span style={{ color: C.dim, fontSize: '14px' }}>/month</span>
              </div>
              <div style={{ fontSize: '13px', color: C.muted, marginBottom: '24px' }}>Try JOANResearchOS at no cost</div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '20px', marginBottom: '24px', flex: 1 }}>
                {['3 analyses per month', 'All 19 statistical tests', 'Line List Builder', 'PDF report download', 'AI interpretation', 'R script download'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: C.muted }}>
                    <span style={{ color: C.starBlue, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
                {['Unlimited analyses', 'Team access'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: '#3a4a5a' }}>
                    <span style={{ color: '#3a4a5a', fontWeight: 700, flexShrink: 0 }}>✗</span>{f}
                  </div>
                ))}
              </div>
              <a href={APP_URL} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.07)', color: C.text, padding: '12px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.14)' }}>
                Get started free
              </a>
            </div>

            {/* RESEARCHER */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.starBlue, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>Researcher</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontSize: '44px', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-space-grotesk), system-ui' }}>₱1,499</span>
                <span style={{ color: C.dim, fontSize: '14px' }}>/month</span>
              </div>
              <div style={{ fontSize: '13px', color: C.muted, marginBottom: '24px' }}>For individual researchers and clinicians</div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '20px', marginBottom: '24px', flex: 1 }}>
                {['Unlimited analyses', 'All 19 statistical tests', 'Line List Builder', 'PDF report download', 'AI interpretation', 'R script download', 'Analysis history', 'Shareable links', 'Priority email support'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: C.muted }}>
                    <span style={{ color: C.starBlue, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <a href={`mailto:${CONTACT_EMAIL}?subject=JOANResearchOS Researcher Plan`} style={{ display: 'block', textAlign: 'center', background: 'rgba(96,165,250,0.12)', color: C.starBlue, padding: '12px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 700, border: '1px solid rgba(96,165,250,0.3)' }}>
                Get Researcher — ₱1,499/mo
              </a>
            </div>

            {/* TEAM — MOST POPULAR */}
            <div style={{ background: `linear-gradient(145deg, rgba(124,92,255,0.18), rgba(46,117,182,0.15))`, border: `2px solid rgba(124,92,255,0.5)`, borderRadius: '18px', padding: '28px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 0 40px rgba(124,92,255,0.15)' }}>
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`, color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 16px', borderRadius: '20px', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                MOST POPULAR
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>Team</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontSize: '44px', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-space-grotesk), system-ui' }}>₱3,499</span>
                <span style={{ color: '#a78bfa', fontSize: '14px' }}>/month</span>
              </div>
              <div style={{ fontSize: '13px', color: '#a78bfa', marginBottom: '24px' }}>For ESU/RESU teams of 2–5 epidemiologists</div>
              <div style={{ borderTop: '1px solid rgba(124,92,255,0.2)', paddingTop: '20px', marginBottom: '24px', flex: 1 }}>
                {['Up to 5 team members', 'Unlimited analyses', 'All 19 statistical tests', 'Line List Builder', 'Shared analysis history', 'Team admin dashboard', 'PDF report download', 'Shareable links', 'Priority email support'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: '#c4b5fd' }}>
                    <span style={{ color: C.violet, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <a href={`mailto:${CONTACT_EMAIL}?subject=JOANResearchOS Team Plan`} style={{ display: 'block', textAlign: 'center', background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`, color: '#fff', padding: '12px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 800, boxShadow: '0 4px 16px rgba(124,92,255,0.4)' }}>
                Get Team — ₱3,499/mo
              </a>
            </div>

            {/* INSTITUTION */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>Institution</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontSize: '44px', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-space-grotesk), system-ui' }}>₱8,999</span>
                <span style={{ color: C.dim, fontSize: '14px' }}>/month</span>
              </div>
              <div style={{ fontSize: '13px', color: C.muted, marginBottom: '24px' }}>For hospitals, universities, and health agencies</div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '20px', marginBottom: '24px', flex: 1 }}>
                {['Up to 20 team members', 'Unlimited analyses', 'All 19 statistical tests', 'Line List Builder', 'Admin dashboard', 'Priority email support', 'DOH/ethics board reports', 'Dedicated onboarding', 'Custom branding'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: C.muted }}>
                    <span style={{ color: C.gold, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <a href={`mailto:${CONTACT_EMAIL}?subject=JOANResearchOS Institution Plan`} style={{ display: 'block', textAlign: 'center', background: 'rgba(232,184,92,0.12)', color: C.gold, padding: '12px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 700, border: '1px solid rgba(232,184,92,0.3)' }}>
                Contact us
              </a>
            </div>
          </div>

          {/* GCash note */}
          <div style={{ marginTop: '32px', padding: '16px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>💳</span>
            <span style={{ fontSize: '13px', color: C.muted }}>Pay via <strong style={{ color: C.text }}>GCash or bank transfer</strong> — send payment, get access within 24 hours. No credit card, no subscriptions.</span>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: '80px', textAlign: 'left', maxWidth: '720px', margin: '80px auto 0' }}>
            <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '32px', textAlign: 'center', fontFamily: 'var(--font-space-grotesk), system-ui' }}>Frequently asked questions</h3>
            {[
              { q: 'Can I trust the results for DOH or WHO reports?', a: 'Yes. All calculations are performed exclusively by R — the same engine used by WHO, CDC, and Philippine DOH. AI generates code and interprets output only. Every analysis includes the R script and raw output for full reproducibility and audit trail.' },
              { q: 'What is the Line List Builder?', a: 'A free tool built into JOANResearchOS that cleans raw KoboToolbox, PIDSR, Google Forms, and hospital EMR exports into WHO-standard line lists. PHI detection, value standardization, and de-identification all happen in your browser — raw data never leaves your device.' },
              { q: 'Is the free plan really free?', a: 'Yes. No credit card required. You get 3 analyses per month with all 19 statistical tests and the full Line List Builder — enough to run a complete outbreak investigation.' },
              { q: 'How do I pay for a paid plan?', a: 'Contact us via the button on your chosen plan and we will send you a GCash or bank transfer payment link. Access is activated within 24 hours of payment confirmation.' },
              { q: 'Why do teams need the Team plan instead of individual Researcher plans?', a: 'The Team plan (₱3,499) costs less than 3 individual Researcher plans (₱4,497). It adds shared analysis history and a team admin dashboard so ESU/RESU supervisors can see their team\'s analyses and manage access.' },
              { q: 'Is my data safe? What about patient privacy?', a: 'Uploaded files are stored in a private Supabase Storage bucket, never publicly accessible, and retrieved only via short-lived signed URLs at analysis time. The Line List Builder processes raw data entirely in your browser — PHI never reaches our servers. See our Privacy Policy for full details.' },
            ].map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', textAlign: 'left', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}
                >
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{faq.q}</span>
                  <span style={{ color: C.violet, fontSize: '20px', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: '20px', color: C.muted, fontSize: '14px', lineHeight: 1.7 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 2rem', background: C.navyMid, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', background: C.violet, filter: 'blur(150px)', opacity: 0.12, pointerEvents: 'none' }} />
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff', marginBottom: '20px', lineHeight: 1.15, fontFamily: 'var(--font-space-grotesk), system-ui', letterSpacing: '-0.5px' }}>
            Start your first outbreak analysis today
          </h2>
          <p style={{ fontSize: '18px', color: C.muted, lineHeight: 1.6, marginBottom: '44px' }}>
            Upload your case line list, describe your investigation question, and get verified epidemiological analysis in minutes — not days.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={APP_URL} target="_blank" rel="noreferrer" style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`, color: '#fff', padding: '16px 40px', borderRadius: '12px', textDecoration: 'none', fontSize: '17px', fontWeight: 800, boxShadow: '0 8px 28px rgba(124,92,255,0.4)' }}>
              Try JOANResearchOS free
            </a>
            <a href={`${APP_URL}/clean`} target="_blank" rel="noreferrer" style={{ background: 'rgba(232,184,92,0.12)', color: C.gold, padding: '16px 28px', borderRadius: '12px', textDecoration: 'none', fontSize: '17px', fontWeight: 700, border: '1px solid rgba(232,184,92,0.3)' }}>
              🧹 Try Line List Builder
            </a>
          </div>
          <p style={{ marginTop: '20px', fontSize: '13px', color: C.dim }}>No registration required · Free tier includes all 19 tests + Line List Builder</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#020408', padding: '40px 2rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '13px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>J</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '16px', fontFamily: 'var(--font-space-grotesk), system-ui' }}>JOANResearchOS</span>
          </div>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              ['/privacy', 'Privacy Policy'],
              ['/terms', 'Terms of Service'],
              [`mailto:${CONTACT_EMAIL}`, 'Contact'],
              [`${APP_URL}/clean`, 'Line List Builder'],
            ].map(([href, label]) => (
              <a key={label} href={href} style={{ color: C.dim, textDecoration: 'none', fontSize: '13px' }}>{label}</a>
            ))}
          </div>
          <p style={{ color: '#1e2a38', fontSize: '12px', margin: 0, textAlign: 'center' }}>
            © 2026 JOANResearchOS · Statistical Engine: R · AI: Claude by Anthropic · All calculations by R, never by AI<br />
            Built for clinical and epidemiological research in the Philippines and beyond
          </p>
        </div>
      </footer>

    </main>
  )
}
