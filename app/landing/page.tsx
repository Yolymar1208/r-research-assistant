'use client'

export default function LandingPage() {
  return (
    <main style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a1a', background: '#fff' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb', padding: '0 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: '#1a3a5c', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>J</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#1a3a5c', letterSpacing: '-0.3px' }}>JOANResearchOS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <a href="#epi" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>For Epidemiologists</a>
            <a href="#tests" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>19 Tests</a>
            <a href="#trust" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>Why trust it</a>
            <a href="#pricing" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>Pricing</a>
            <a href="https://r-research-assistant-vx33.vercel.app" target="_blank" rel="noreferrer" style={{ background: '#1a3a5c', color: '#fff', padding: '8px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Try for free</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #0f2338 0%, #1a3a5c 100%)', padding: '100px 2rem 80px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(46,117,182,0.3)', color: '#7ec8f4', fontSize: '13px', fontWeight: 600, padding: '4px 14px', borderRadius: '20px', marginBottom: '24px', border: '1px solid rgba(46,117,182,0.4)' }}>
            Built for Epidemiologists, Clinicians & Researchers
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-1px' }}>
            You understand the statistics.<br />
            <span style={{ color: '#60a5fa' }}>We handle the R.</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#94b8d4', lineHeight: 1.6, marginBottom: '16px', maxWidth: '680px', margin: '0 auto 16px' }}>
            JOANResearchOS runs epidemic curves, attack rate tables, survival analysis, and 16 other statistical tests — just by describing your research question in plain language.
          </p>
          <p style={{ fontSize: '16px', color: '#6b8fa8', lineHeight: 1.5, marginBottom: '40px', maxWidth: '580px', margin: '0 auto 40px' }}>
            AI generates the R code. R computes every p-value, confidence interval, and effect size. You get a PDF report ready for DOH, WHO, or your ethics board.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://r-research-assistant-vx33.vercel.app" target="_blank" rel="noreferrer" style={{ background: '#2e75b6', color: '#fff', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 700 }}>
              Start analyzing free
            </a>
            <a href="#epi" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
              See epi features →
            </a>
          </div>
          <p style={{ marginTop: '20px', fontSize: '13px', color: '#4a6a85' }}>No credit card required · Free to start · Works on any device</p>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ background: '#2e75b6', padding: '16px 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
          {['19 statistical tests', 'R computes all values', 'Epidemic curves built-in', 'DOH/WHO-ready PDF reports', 'Attack rate tables', 'Survival analysis'].map((text) => (
            <div key={text} style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>✓ {text}</div>
          ))}
        </div>
      </section>

      {/* EPI SECTION */}
      <section style={{ padding: '80px 2rem', background: '#fff' }} id="epi">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', fontSize: '13px', fontWeight: 600, padding: '4px 14px', borderRadius: '20px', marginBottom: '16px' }}>
              Epidemiology-specific features
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a5c', marginBottom: '16px' }}>
              Built for outbreak investigation and surveillance
            </h2>
            <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6, maxWidth: '680px', margin: '0 auto' }}>
              The EpiR Handbook is used by 850,000 epidemiologists worldwide — because R is powerful but hard. JOANResearchOS makes every chapter of the handbook accessible without writing a single line of code.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {[
              {
                icon: '📈',
                title: 'Epidemic Curves',
                subtitle: 'EpiR Handbook Ch. 32',
                desc: 'Auto-generates an epicurve from your case line list. Automatically selects daily, weekly, or monthly intervals based on outbreak duration. Identifies peak period and case counts.',
                tags: ['Date of onset', 'Auto-interval selection', 'Peak detection'],
              },
              {
                icon: '⚔️',
                title: 'Attack Rate Tables',
                subtitle: 'EpiR Handbook Ch. 16',
                desc: 'Standard 2x2 outbreak table comparing exposed vs unexposed groups. Calculates attack rates per group, Risk Ratio, Odds Ratio, Attributable Risk, and Population Attributable Risk.',
                tags: ['Risk Ratio', 'Odds Ratio', 'Attributable Risk'],
              },
              {
                icon: '🔺',
                title: 'Age-Sex Pyramids',
                subtitle: 'EpiR Handbook Ch. 33',
                desc: 'Demographic breakdown of cases by age group and sex. Auto-bins numeric ages into standard epi groups (0-4, 5-9... 75+). Calculates median and mean age by sex.',
                tags: ['Standard age groups', 'Sex breakdown', 'Proportions'],
              },
              {
                icon: '⏱️',
                title: 'Survival Analysis',
                subtitle: 'EpiR Handbook Ch. 27',
                desc: 'Kaplan-Meier curves, case fatality rate, and median survival time from symptom onset to outcome. Stratified analysis by severity, vaccination status, or comorbidities.',
                tags: ['CFR', 'Kaplan-Meier', 'Cox regression'],
              },
              {
                icon: '📉',
                title: 'Moving Averages',
                subtitle: 'EpiR Handbook Ch. 22',
                desc: '7-day and 14-day rolling averages to smooth surveillance noise. Detects peak timing, trend direction (increasing/decreasing), and weekly totals for situational reports.',
                tags: ['7-day MA', 'Trend detection', 'Weekly totals'],
              },
              {
                icon: '📊',
                title: '14 More Statistical Tests',
                subtitle: 'All automatically selected',
                desc: 'Chi-square, Fisher\'s Exact, logistic regression, Mann-Whitney, Kruskal-Wallis, t-tests, ANOVA, correlations, and more — all triggered by describing your research question.',
                tags: ['Auto test selection', 'Effect sizes', 'Assumptions checked'],
              },
            ].map((f) => (
              <div key={f.title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{f.icon}</div>
                <div style={{ fontWeight: 700, color: '#1a3a5c', fontSize: '16px', marginBottom: '4px' }}>{f.title}</div>
                <div style={{ fontSize: '11px', color: '#2e75b6', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.subtitle}</div>
                <div style={{ color: '#555', fontSize: '14px', lineHeight: 1.6, marginBottom: '14px' }}>{f.desc}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {f.tags.map(t => (
                    <span key={t} style={{ background: '#dbeafe', color: '#1e40af', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section style={{ padding: '80px 2rem', background: '#f0f4f8' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a5c', marginBottom: '16px' }}>From case line list to outbreak report in minutes</h2>
          <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6, marginBottom: '60px' }}>No R installation. No coding. No waiting for a statistician.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { step: '01', title: 'Upload your Excel case line list', desc: 'Drag and drop your .xlsx file. The system reads column names, detects date columns, identifies variable types, and flags missing values automatically.', color: '#dbeafe', text: '#1e40af' },
              { step: '02', title: 'Describe your investigation question', desc: 'Type in plain language: "What is the epidemic curve by symptom onset date?" or "What is the attack rate among vaccinated vs unvaccinated cases?" No special syntax needed.', color: '#dcfce7', text: '#166534' },
              { step: '03', title: 'AI selects the correct epi test', desc: 'JOANResearchOS reads your data profile and question, selects the appropriate analysis (epidemic curve, attack rate table, survival analysis, etc.), and generates the R code.', color: '#fef9c3', text: '#854d0e' },
              { step: '04', title: 'R executes and computes every value', desc: 'The R statistical engine runs the analysis. Every attack rate, risk ratio, p-value, and survival estimate is computed by R — not estimated or fabricated by AI.', color: '#fce7f3', text: '#9d174d' },
              { step: '05', title: 'Download your PDF outbreak report', desc: 'Professional report with your research question, analysis plan, full statistical output, AI interpretation, and the complete R script for reproducibility and audit trail.', color: '#ede9fe', text: '#6b21a8' },
            ].map((s, i) => (
              <div key={s.step} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', padding: '24px 0', borderBottom: i < 4 ? '1px solid #e2e8f0' : 'none', textAlign: 'left' }}>
                <div style={{ flexShrink: 0, width: '52px', height: '52px', background: s.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', color: s.text }}>{s.step}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '17px', color: '#1a3a5c', marginBottom: '6px' }}>{s.title}</div>
                  <div style={{ color: '#555', fontSize: '15px', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section style={{ padding: '80px 2rem', background: '#fff' }} id="trust">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a5c', marginBottom: '16px' }}>Results you can publish, present, and defend</h2>
            <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6 }}>Every design decision was made with one goal: statistical output that meets academic and public health reporting standards.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { title: 'R is the only calculator', desc: 'AI never estimates or computes statistical values. Every attack rate, risk ratio, p-value, confidence interval, and effect size comes exclusively from R — the gold standard used by WHO, CDC, and IATF.', icon: '🔬' },
              { title: 'Full audit trail', desc: 'Every analysis includes the complete R script and verbatim R console output. Any biostatistician can re-run it independently and get identical results. Perfect for DOH and ethics board submissions.', icon: '📋' },
              { title: 'DOH and WHO aligned', desc: 'Output format follows standard epidemiological reporting conventions. Attack rate tables, epicurves, and survival analysis are structured to match what surveillance reports and outbreak investigations require.', icon: '🏥' },
            ].map((t) => (
              <div key={t.title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{t.icon}</div>
                <div style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: '10px', fontSize: '16px' }}>{t.title}</div>
                <div style={{ color: '#555', fontSize: '14px', lineHeight: 1.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALL 19 TESTS */}
      <section style={{ padding: '60px 2rem', background: '#f0f4f8' }} id="tests">
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1a3a5c', marginBottom: '40px' }}>19 statistical tests — automatically selected</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {([
              ['Parametric', ['Descriptive Statistics', 'Independent t-test', 'Paired t-test', 'One-Way ANOVA', 'Chi-Square Test', 'Pearson Correlation']],
              ['Non-Parametric', ['Mann-Whitney U', 'Wilcoxon Signed-Rank', 'Kruskal-Wallis', 'Spearman Correlation', "Fisher's Exact Test", "McNemar's Test"]],
              ['Regression', ['Logistic Regression', 'Linear Regression']],
              ['Epidemiology', ['Epidemic Curve', 'Attack Rate Table', 'Age-Sex Pyramid', 'Survival Analysis', 'Moving Average']],
            ] as [string, string[]][]).map(([group, tests]) => (
              <div key={group} style={{ background: group === 'Epidemiology' ? '#1a3a5c' : '#fff', border: group === 'Epidemiology' ? 'none' : '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: group === 'Epidemiology' ? '#7ec8f4' : '#1a3a5c', marginBottom: '12px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group}</div>
                {tests.map((t) => (
                  <div key={t} style={{ fontSize: '13px', color: group === 'Epidemiology' ? '#e2eaf2' : '#444', padding: '4px 0', borderBottom: `1px solid ${group === 'Epidemiology' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: group === 'Epidemiology' ? '#60a5fa' : '#2e75b6', fontWeight: 700 }}>✓</span> {t}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '80px 2rem', background: '#fff' }} id="pricing">
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a5c', marginBottom: '16px' }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6, marginBottom: '60px' }}>Start free. Upgrade when you need unlimited analyses or team access.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', textAlign: 'left' }}>

            {/* FREE */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Free</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '42px', fontWeight: 800, color: '#1a3a5c' }}>₱0</span>
                  <span style={{ color: '#888', fontSize: '14px' }}>/month</span>
                </div>
                <div style={{ fontSize: '14px', color: '#555' }}>Try JOANResearchOS at no cost</div>
              </div>
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '24px', marginBottom: '32px', flex: 1 }}>
                {['5 analyses per month', 'All 19 statistical tests', 'PDF report download', 'Excel file upload', 'AI interpretation', 'R script download'].map((f) => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#444' }}>
                    <span style={{ color: '#2e75b6', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
                {['Unlimited analyses', 'Team access'].map((f) => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#bbb' }}>
                    <span style={{ color: '#ddd', fontWeight: 700, flexShrink: 0 }}>✗</span>{f}
                  </div>
                ))}
              </div>
              <a href="https://r-research-assistant-vx33.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: '#f0f4f8', color: '#1a3a5c', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontSize: '15px', fontWeight: 700, border: '2px solid #1a3a5c' }}>
                Get started free
              </a>
            </div>

            {/* PRO */}
            <div style={{ background: '#1a3a5c', border: '2px solid #2e75b6', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#2e75b6', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '4px 16px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                MOST POPULAR
              </div>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#94b8d4', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Pro</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '42px', fontWeight: 800, color: '#fff' }}>₱999</span>
                  <span style={{ color: '#94b8d4', fontSize: '14px' }}>/month</span>
                </div>
                <div style={{ fontSize: '14px', color: '#94b8d4' }}>For individual researchers and clinicians</div>
              </div>
              <div style={{ borderTop: '1px solid #2e4a6a', paddingTop: '24px', marginBottom: '32px', flex: 1 }}>
                {['Unlimited analyses', 'All 19 statistical tests', 'All 5 epi-specific tests', 'PDF report download', 'Excel file upload', 'AI interpretation', 'R script download', 'Analysis history', 'Priority email support'].map((f) => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#e2eaf2' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <a href="mailto:antetokounmpo8@gmail.com?subject=JOANResearchOS Pro Plan Inquiry" style={{ display: 'block', textAlign: 'center', background: '#fff', color: '#1a3a5c', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontSize: '15px', fontWeight: 700 }}>
                Get Pro — ₱999/mo
              </a>
            </div>

            {/* INSTITUTION */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Institution</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '42px', fontWeight: 800, color: '#1a3a5c' }}>₱4,999</span>
                  <span style={{ color: '#888', fontSize: '14px' }}>/month</span>
                </div>
                <div style={{ fontSize: '14px', color: '#555' }}>For hospitals, universities, and health agencies</div>
              </div>
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '24px', marginBottom: '32px', flex: 1 }}>
                {['Unlimited analyses', 'All 19 statistical tests', 'All 5 epi-specific tests', 'PDF report download', 'Excel file upload', 'AI interpretation', 'R script download', 'Up to 20 team members', 'Admin dashboard', 'Dedicated support', 'DOH/ethics board ready reports', 'Custom institution branding'].map((f) => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#444' }}>
                    <span style={{ color: '#2e75b6', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <a href="mailto:antetokounmpo8@gmail.com?subject=JOANResearchOS Institution Plan Inquiry" style={{ display: 'block', textAlign: 'center', background: '#1a3a5c', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontSize: '15px', fontWeight: 700 }}>
                Contact us
              </a>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: '60px', textAlign: 'left', maxWidth: '700px', margin: '60px auto 0' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#1a3a5c', marginBottom: '24px', textAlign: 'center' }}>Frequently asked questions</h3>
            {[
              { q: 'Can I trust the results for DOH or WHO reports?', a: 'Yes. All calculations are performed exclusively by R — the same statistical engine used by WHO, CDC, and the Philippine DOH. AI generates code and interprets output only. Every analysis includes the R script and raw output for full reproducibility and audit trail.' },
              { q: 'Does it work with my standard case line list format?', a: 'Yes. Upload any .xlsx file with your case data. The system automatically detects date columns, identifies variable types (categorical, numeric, date), and handles common issues like missing values and merged cells.' },
              { q: 'Is the free plan really free?', a: 'Yes. No credit card required. You get 5 analyses per month with all 19 statistical tests including all 5 epidemiology-specific tests — enough to run a full outbreak investigation.' },
              { q: 'How do I pay for Pro or Institution?', a: 'Contact us via the button above and we will send you a GCash or bank transfer payment link. Access is activated within 24 hours of payment confirmation.' },
              { q: 'Can multiple epidemiologists from my team use it?', a: 'Yes. The Institution plan supports up to 20 team members with a shared admin dashboard. Each member has their own account and analysis history.' },
            ].map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid #e2e8f0', padding: '20px 0' }}>
                <div style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: '8px', fontSize: '15px' }}>{faq.q}</div>
                <div style={{ color: '#555', fontSize: '14px', lineHeight: 1.6 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 2rem', background: '#0f2338' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>
            Start your first outbreak analysis today
          </h2>
          <p style={{ fontSize: '18px', color: '#94b8d4', lineHeight: 1.6, marginBottom: '40px' }}>
            Upload your case line list, describe your investigation question, and get verified epidemiological analysis in minutes — not days.
          </p>
          <a href="https://r-research-assistant-vx33.vercel.app" target="_blank" rel="noreferrer" style={{ background: '#2e75b6', color: '#fff', padding: '16px 40px', borderRadius: '10px', textDecoration: 'none', fontSize: '18px', fontWeight: 800, display: 'inline-block' }}>
            Try JOANResearchOS free
          </a>
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#4a6a85' }}>No registration required to start · Free tier includes all 19 tests</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#060f1a', padding: '32px 2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '28px', height: '28px', background: '#2e75b6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '12px' }}>J</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>JOANResearchOS</span>
        </div>
        <p style={{ color: '#4a6a85', fontSize: '13px', marginBottom: '8px' }}>Statistical Engine: R · AI: Claude by Anthropic · All calculations by R, never by AI</p>
        <p style={{ color: '#2a3a4a', fontSize: '12px' }}>© 2026 JOANResearchOS · Built for clinical and epidemiological research in the Philippines and beyond</p>
      </footer>

    </main>
  )
}
