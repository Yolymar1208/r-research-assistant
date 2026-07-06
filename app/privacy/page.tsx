'use client'

export default function PrivacyPolicyPage() {
  const sectionStyle = { marginBottom: '32px' }
  const h2Style = { fontSize: '20px', fontWeight: 800, color: '#1a3a5c', marginBottom: '12px' }
  const pStyle = { fontSize: '15px', color: '#444', lineHeight: 1.7, marginBottom: '12px' }
  const liStyle = { fontSize: '15px', color: '#444', lineHeight: 1.7, marginBottom: '8px' }

  return (
    <main style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a1a', background: '#fff', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #e5e7eb', padding: '0 2rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', background: '#1a3a5c', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>J</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#1a3a5c' }}>JOANResearchOS</span>
          </a>
          <a href="/" style={{ color: '#2e75b6', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← Back to app</a>
        </div>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 2rem 100px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a3a5c', marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '48px' }}>Last updated: July 6, 2026</p>

        <div style={sectionStyle}>
          <p style={pStyle}>
            JOANResearchOS ("we," "our," "the service") is a statistical analysis platform built for nurses, physicians,
            researchers, and epidemiologists. This policy explains what information we collect, how we use it, and how
            it is protected. We've written it to reflect exactly how the service is built, not generic boilerplate.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. Information We Collect</h2>
          <p style={pStyle}><strong>Account information:</strong> your email address and authentication credentials, managed through Supabase Auth (including Google OAuth if you sign in that way).</p>
          <p style={pStyle}><strong>Uploaded datasets:</strong> the Excel files you upload for analysis, stored in a private Supabase Storage bucket accessible only via short-lived, time-limited signed URLs generated at the moment an analysis runs.</p>
          <p style={pStyle}><strong>Analysis content:</strong> your research questions, hypotheses, the R code generated for your analysis, the raw R output, and the AI-written interpretation — saved to your analysis history so you can revisit past work.</p>
          <p style={pStyle}><strong>Usage data:</strong> how many analyses you've run in a given month, used to enforce plan limits (Free, Researcher, Team, and Institution).</p>
          <p style={pStyle}><strong>Line List Builder:</strong> when you use the Line List Builder (/clean), your raw data file is processed entirely in your browser. Column names and value distributions may be sent to our AI service for cleaning suggestions, but raw patient data and row-level data never leave your device. The de-identified output you choose to export is what you upload to JOANResearchOS for analysis.</p>
          <p style={pStyle}><strong>Team data:</strong> if you are on a Team or Institution plan, your team name and member email addresses are stored to manage team access. Team members can see each other's shared analysis history within the team workspace.</p>
          <p style={pStyle}><strong>Payment-related communication:</strong> if you upgrade to a paid plan, we correspond by email to arrange GCash or bank transfer. We do not collect or store your card or bank account numbers — payment happens directly between you and us via your bank or GCash app, outside this platform.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. Your Responsibility for Uploaded Data</h2>
          <p style={pStyle}>
            JOANResearchOS is designed to be used with <strong>de-identified data only.</strong> Please do not upload datasets
            containing real patient names, exact addresses, national ID numbers, or other directly identifying information.
            You are responsible for de-identifying your data before upload and for ensuring your use of this platform
            complies with your institution's data governance policies and applicable law, including the Philippine
            Data Privacy Act of 2012 (RA 10173) where applicable.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. How We Use Your Information</h2>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <li style={liStyle}>To run the statistical analysis you request and return results to you</li>
            <li style={liStyle}>To maintain your analysis history so you can revisit, re-download, or verify past work</li>
            <li style={liStyle}>To enforce usage limits associated with your subscription plan</li>
            <li style={liStyle}>To communicate with you about your account, billing, or service updates</li>
            <li style={liStyle}>To diagnose and fix technical issues</li>
          </ul>
          <p style={pStyle}>We do not sell your data, and we do not use your uploaded datasets or research questions to train AI models.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>4. Service Providers We Use</h2>
          <p style={pStyle}>To operate JOANResearchOS, your data passes through the following infrastructure providers, each acting as a data processor on our behalf:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <li style={liStyle}><strong>Supabase</strong> — authentication, database, and private file storage</li>
            <li style={liStyle}><strong>Vercel</strong> — application hosting</li>
            <li style={liStyle}><strong>Render.com</strong> — runs the R statistical engine that performs your calculations</li>
            <li style={liStyle}><strong>Anthropic (Claude API)</strong> — generates R code and writes plain-language interpretations of R's output; Anthropic does not compute or see final statistical decisions, only the data needed to plan and explain the analysis</li>
            <li style={liStyle}><strong>Yahoo Mail SMTP</strong> — sends transactional account emails</li>
          </ul>
          <p style={pStyle}>We do not share your data with advertisers or data brokers, and none of these providers are permitted to use your data for purposes outside operating the service.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Reports and Exports</h2>
          <p style={pStyle}>
            PDF reports are generated client-side in your browser — they are never transmitted to our servers. PowerPoint exports are generated on our servers using your analysis content and chart image, then immediately delivered to your browser and not retained. Chart images generated by R are encoded and returned with your analysis results, then stored as part of your analysis history.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Data Retention</h2>
          <p style={pStyle}>
            We retain your account information, uploaded datasets, and analysis history for as long as your account
            remains active, or as needed to provide the history and reproducibility features of the service. If you
            would like your account and associated data deleted, contact us at the email below and we will process
            the request.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Security</h2>
          <p style={pStyle}>
            Uploaded files are stored in a private storage bucket, never publicly accessible, and are only ever
            retrieved using short-lived signed URLs generated at the moment an analysis is executed. All traffic to
            the application is encrypted in transit (HTTPS). Database access is governed by row-level security
            policies restricting access to your own data.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Children's Privacy</h2>
          <p style={pStyle}>JOANResearchOS is a professional research tool and is not directed at or intended for use by children.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Changes to This Policy</h2>
          <p style={pStyle}>If this policy changes materially, we will update the "Last updated" date above and, where appropriate, notify active users by email.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>10. Contact</h2>
          <p style={pStyle}>
            Questions about this policy or your data can be sent to{' '}
            <a href="mailto:yolymarorfiano@yahoo.com" style={{ color: '#2e75b6' }}>yolymarorfiano@yahoo.com</a>.
          </p>
        </div>
      </div>

      <footer style={{ background: '#060f1a', padding: '24px 2rem', textAlign: 'center' }}>
        <p style={{ color: '#4a6a85', fontSize: '13px' }}>
          <a href="/landing" style={{ color: '#4a6a85' }}>JOANResearchOS</a> ·{' '}
          <a href="/terms" style={{ color: '#4a6a85' }}>Terms of Service</a>
        </p>
      </footer>
    </main>
  )
}
