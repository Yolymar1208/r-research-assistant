'use client'

import type { AppStep } from '@/app/types'

interface Props {
  step: AppStep
  errorMessage?: string | null
}

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'inspect', label: 'Inspect' },
  { key: 'analyzing', label: 'AI Planning' },
  { key: 'executing', label: 'R Running' },
  { key: 'interpreting', label: 'Interpreting' },
  { key: 'complete', label: 'Complete' },
]

const STEP_ORDER: AppStep[] = [
  'upload', 'inspect', 'question', 'analyzing', 'executing', 'interpreting', 'complete'
]

function getStepIndex(step: AppStep): number {
  return STEP_ORDER.indexOf(step)
}

// Frosted light palette — matches DatasetSummaryPanel
const BG = {
  panel:   'rgba(240,244,250,0.97)',
  header:  'rgba(228,236,248,0.95)',
  border:  'rgba(180,200,230,0.5)',
  text:    '#1a2a3a',
  subtext: '#4a6080',
  muted:   '#8098b8',
}

export default function StatusIndicator({ step, errorMessage }: Props) {
  const currentIndex = getStepIndex(step)
  const isError = step === 'error'
  const isBusy = step === 'analyzing' || step === 'executing' || step === 'interpreting'

  return (
    <div style={{ background: BG.panel, border: `1px solid ${BG.border}`, borderRadius: '8px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 700, color: BG.text, margin: 0 }}>Analysis Status</h2>
        {isBusy && (
          <span style={{ position: 'relative', display: 'inline-flex', width: '8px', height: '8px' }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#3b82f6', opacity: 0.75, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
            <span style={{ position: 'relative', borderRadius: '50%', width: '8px', height: '8px', background: '#2563eb' }} />
          </span>
        )}
      </div>

      {isError ? (
        <div style={{ background: 'rgba(254,242,242,0.97)', border: '1px solid rgba(252,165,165,0.6)', borderRadius: '8px', padding: '10px 14px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>Error</p>
          {errorMessage && <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}>{errorMessage}</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {STEPS.filter(s => s.key !== 'question').map((s, i, arr) => {
            const sIndex = getStepIndex(s.key)
            const isDone = sIndex < currentIndex
            const isCurrent = sIndex === currentIndex
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, border: '2px solid',
                    borderColor: isDone ? '#22c55e' : isCurrent ? '#3b82f6' : BG.border,
                    background: isDone ? '#22c55e' : isCurrent ? '#3b82f6' : BG.panel,
                    color: isDone || isCurrent ? '#fff' : BG.muted,
                    transition: 'all 0.2s',
                  }}>
                    {isDone ? '✓' : isCurrent && isBusy ? '…' : sIndex + 1}
                  </div>
                  <span style={{ fontSize: '10px', marginTop: '4px', whiteSpace: 'nowrap', fontWeight: isCurrent ? 600 : 400, color: isDone ? '#16a34a' : isCurrent ? '#2563eb' : BG.muted }}>
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ height: '2px', width: '20px', margin: '0 2px 18px', background: sIndex < currentIndex ? '#22c55e' : BG.border, transition: 'background 0.2s' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '11px', color: BG.subtext }}>
        {step === 'upload' && 'Waiting for file upload'}
        {step === 'inspect' && 'Dataset loaded — enter your research question below'}
        {step === 'question' && 'Ready to generate analysis'}
        {step === 'analyzing' && 'AI is reading your dataset and selecting the appropriate test — usually 3–5 seconds.'}
        {step === 'executing' && 'R is running the statistical analysis. If the server has been idle, it may take up to 20–30 seconds to wake up — this is normal, please keep this tab open.'}
        {step === 'interpreting' && 'AI is writing a plain-language interpretation of the R output — usually 3–5 seconds.'}
        {step === 'complete' && 'Analysis complete — see results below. All statistical values were computed by R.'}
        {step === 'error' && 'Check error details below'}
      </div>

      <style>{`@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }`}</style>
    </div>
  )
}
