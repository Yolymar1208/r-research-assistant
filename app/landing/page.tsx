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
            <a href="#features" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>Features</a>
            <a href="#workflow" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>How it works</a>
            <a href="#trust" style={{ color: '#555', textDecoration: 'none', fontSize: '14px' }}>Why trust it</a>
            <a href="https://r-research-assistant-vx33.vercel.app" target="_blank" rel="noreferrer" style={{ background: '#1a3a5c', color: '#fff', padding: '8px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Try for free</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: '#f0f4f8', padding: '100px 2rem 80px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', fontSize: '13px', fontWeight: 600, padding: '4px 14px', borderRadius: '20px', marginBottom: '24px' }}>
            Statistical Analysis Platform
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 800, color: '#1a3a5c', lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-1px' }}>
            Research-grade statistics.<br />
            <span style={{ color: '#2e75b6' }}>No R programming required.</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#444', lineHeight: 1.6, marginBottom: '40px', maxWidth: '620px', margin: '0 auto 40px' }}>
            JOANResearchOS lets nurses, physicians, and researchers run hospital-grade statistical analysis by describing their research question in plain language. AI writes the code. R computes the results.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://r-research-assistant-vx33.vercel.app" target="_blank" rel="noreferrer" style={{ background: '#1a3a5c', color: '#fff', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 700 }}>
              Start analyzing free
            </a>
            <a href="#workflow" style={{ background: '#fff', color: '#1a3a5c', padding: '14px 32px', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 600, border: '2px solid #1a3a5c' }}>
              See how it works
            </a>
          </div>
          <p style={{ marginTop: '20px', fontSize: '13px', color: '#888' }}>No credit card required · Free to start · Works on any device</p>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ background: '#1a3a5c', padding: '20px 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
          {['Built for clinical research', '14 statistical tests', 'R computes all values', 'PDF reports included', 'Reproducible analysis'].map((text) => (
            <div key={text} style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>✓ {text}</div>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ padding: '80px 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a5c', marginBottom: '16px' }}>Researchers should not need to be programmers</h2>
          <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6, marginBottom: '60px' }}>You went to medical school, not coding bootcamp. But getting your data analyzed means learning R, waiting for a statistician, or trusting AI tools that fabricate p-values.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { title: 'Learning R takes months', desc: 'Most clinicians do not have time to master a programming language', icon: '⏳' },
              { title: 'Statisticians are expensive', desc: 'Outsourcing delays your research and costs your budget', icon: '💸' },
              { title: 'AI tools fabricate results', desc: 'ChatGPT invents p-values. You cannot publish what you cannot verify.', icon: '⚠️' },
            ].map((p) => (
              <div key={p.title} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{p.icon}</div>
                <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: '8px', fontSize: '15px' }}>{p.title}</div>
                <div style={{ color: '#555', fontSize: '14px', lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 2rem', background: '#f0f4f8' }} id="features">
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a5c', marginBottom: '16px' }}>Describe your question. Get verified statistics.</h2>
          <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6, marginBottom: '60px' }}>JOANResearchOS is the only platform where AI generates the code and R computes every statistical value. Every result is traceable, reproducible, and publishable.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', textAlign: 'left' }}>
            {[
              { title: '14 statistical tests', desc: 'From chi-square and t-tests to logistic regression and Mann-Whitney, all automatically selected based on your data and research question', icon: '📊' },
              { title: 'Automatic data cleaning', desc: 'Detects missing values, wrong variable types, pending results, and small sample sizes, then fixes them before analysis runs', icon: '🧹' },
              { title: 'R is the engine', desc: 'Every mean, p-value, confidence interval, and effect size comes from R. AI only writes code and interprets output — never computes.', icon: '⚙️' },
              { title: 'PDF report in one click', desc: 'Professional report with research question, analysis plan, raw R output, AI interpretation, and reproducible code included', icon: '📄' },
              { title: 'Plain language results', desc: 'AI translates R output into clear clinical interpretation that a doctor, nurse, or ethics board can understand', icon: '💬' },
              { title: 'Works on any Excel file', desc: 'Upload your .xlsx file. The system handles merged cells, title rows, and messy headers automatically without reformatting', icon: '📁' },
            ].map((f) => (
              <div key={f.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
                <div style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: '8px', fontSize: '15px' }}>{f.title}</div>
                <div style={{ color: '#555', fontSize: '14px', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section style={{ padding: '80px 2rem', background: '#fff' }} id="workflow">
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a5c', marginBottom: '16px' }}>From Excel to published results in minutes</h2>
          <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6, marginBottom: '60px' }}>No installation. No code. No statistics degree required.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { step: '01', title: 'Upload your Excel file', desc: 'Drag and drop your dataset. The system instantly reads column names, detects data types, and flags missing values.', color: '#dbeafe', text: '#1e40af' },
              { step: '02', title: 'Describe your research question', desc: 'Type your question in plain language. "Is there a difference in pain scores between spinal and general anesthesia?"', color: '#dcfce7', text: '#166534' },
              { step: '03', title: 'AI selects the right test', desc: 'JOANResearchOS reads your data profile, detects variable types, and chooses the appropriate statistical test with full justification.', color: '#fef9c3', text: '#854d0e' },
              { step: '04', title: 'R executes the analysis', desc: 'AI generates clean R code. R runs it. Every p-value, confidence interval, and effect size comes from R — not AI.', color: '#fce7f3', text: '#9d174d' },
              { step: '05', title: 'Download your PDF report', desc: 'Professional report with your research question, analysis plan, raw R output, AI interpretation, and reproducible R script.', color: '#ede9fe', text: '#6b21a8' },
            ].map((s, i) => (
              <div key={s.step} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', padding: '24px 0', borderBottom: i < 4 ? '1px solid #f0f0f0' : 'none', textAlign: 'left' }}>
                <div style={{ flexShrink: 0, width: '52px', height: '52px', background: s.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', color: s.text }}>
                  {s.step}
                </div>
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
      <section style={{ padding: '80px 2rem', background: '#f0f4f8' }} id="trust">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a5c', marginBottom: '16px' }}>Built for academic and clinical trust</h2>
            <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.6 }}>Every design decision was made with one goal: results you can publish, present, and defend.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { title: 'R is the only calculator', desc: 'AI never estimates or computes statistical values. Every number comes exclusively from R, the gold standard language trusted by WHO, CDC, and academic journals worldwide.', icon: '🔬' },
              { title: 'Full transparency', desc: 'Every analysis shows the complete R script that ran, the verbatim R console output, and the AI interpretation side by side. Nothing is hidden. Everything is auditable.', icon: '👁️' },
              { title: 'Reproducible by design', desc: 'Download the exact R script with every analysis. Any statistician can re-run it independently and get identical results. Your analysis is permanently reproducible.', icon: '♻️' },
            ].map((t) => (
              <div key={t.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{t.icon}</div>
                <div style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: '10px', fontSize: '16px' }}>{t.title}</div>
                <div style={{ color: '#555', fontSize: '14px', lineHeight: 1.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTS */}
      <section style={{ padding: '60px 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1a3a5c', marginBottom: '40px' }}>14 statistical tests, automatically selected</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {([
              ['Parametric', ['Descriptive Statistics', 'Independent t-test', 'Paired t-test', 'One-Way ANOVA', 'Chi-Square Test', 'Pearson Correlation']],
              ['Non-Parametric', ['Mann-Whitney U', 'Wilcoxon Signed-Rank', 'Kruskal-Wallis', 'Spearman Correlation', "Fisher's Exact Test", "McNemar's Test"]],
              ['Regression', ['Logistic Regression', 'Linear Regression']],
            ] as [string, string[]][]).map(([group, tests]) => (
              <div key={group} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: '12px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group}</div>
                {tests.map((t) => (
                  <div key={t} style={{ fontSize: '13px', color: '#444', padding: '4px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#2e75b6', fontWeight: 700 }}>✓</span> {t}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 2rem', background: '#1a3a5c' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>Start your first analysis today</h2>
          <p style={{ fontSize: '18px', color: '#94b8d4', lineHeight: 1.6, marginBottom: '40px' }}>Upload your data, type your research question, and get verified statistical results in minutes.</p>
          <a href="https://r-research-assistant-vx33.vercel.app" target="_blank" rel="noreferrer" style={{ background: '#fff', color: '#1a3a5c', padding: '16px 40px', borderRadius: '10px', textDecoration: 'none', fontSize: '18px', fontWeight: 800, display: 'inline-block' }}>
            Try JOANResearchOS free
          </a>
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#6b8fa8' }}>No registration required · Free to start</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0f2338', padding: '32px 2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '28px', height: '28px', background: '#2e75b6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '12px' }}>J</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>JOANResearchOS</span>
        </div>
        <p style={{ color: '#6b8fa8', fontSize: '13px', marginBottom: '8px' }}>Statistical Engine: R · AI: Claude by Anthropic · All calculations by R, never by AI</p>
        <p style={{ color: '#4a6a85', fontSize: '12px' }}>© 2026 JOANResearchOS · Built for clinical and academic research</p>
      </footer>

    </main>
  )
}
