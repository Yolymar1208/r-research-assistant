'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'joanresearchos_onboarding_v1'
const DISMISS_KEY = 'joanresearchos_onboarding_dismissed'

const EPI_TESTS = ['epidemic_curve', 'attack_rate_table', 'age_sex_pyramid', 'survival_analysis', 'moving_average']

export interface OnboardingState {
  uploadedDataset: boolean
  ranAnalysis: boolean
  downloadedReport: boolean
  triedEpiTest: boolean
}

const DEFAULT_STATE: OnboardingState = {
  uploadedDataset: false,
  ranAnalysis: false,
  downloadedReport: false,
  triedEpiTest: false,
}

export function loadOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE
  } catch { return DEFAULT_STATE }
}

export function saveOnboardingState(state: Partial<OnboardingState>) {
  if (typeof window === 'undefined') return
  try {
    const current = loadOnboardingState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }))
  } catch {}
}

export function markEpiTestRun(selectedTest: string) {
  if (EPI_TESTS.includes(selectedTest)) {
    saveOnboardingState({ triedEpiTest: true })
  }
}

interface Props {
  state: OnboardingState
  onDismiss: () => void
}

const STEPS = [
  { key: 'uploadedDataset' as const, icon: '📁', label: 'Upload a dataset', detail: 'Drop any Excel file or try the sample dataset' },
  { key: 'ranAnalysis' as const, icon: '🔬', label: 'Run your first analysis', detail: 'Describe your research question and click Generate' },
  { key: 'downloadedReport' as const, icon: '📄', label: 'Download a PDF report', detail: 'Click ↓ PDF Report on your completed analysis' },
  { key: 'triedEpiTest' as const, icon: '📈', label: 'Try an epidemiology test', detail: 'Run an epidemic curve, attack rate table, or age-sex pyramid' },
]

export default function OnboardingChecklist({ state, onDismiss }: Props) {
  const completed = Object.values(state).filter(Boolean).length
  const total = STEPS.length
  const allDone = completed === total
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        background: 'rgba(18,26,48,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: allDone ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(124,92,255,0.25)',
        marginBottom: '8px',
      }}
    >
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${(completed / total) * 100}%`,
            background: allDone
              ? 'linear-gradient(90deg, #4ade80, #22c55e)'
              : 'linear-gradient(90deg, #7c5cff, #2e75b6)',
          }}
        />
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: allDone ? '#86efac' : '#f1f4fc', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>
              {allDone ? '🎉 You\'re all set!' : 'Getting started'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
              background: allDone ? 'rgba(74,222,128,0.15)' : 'rgba(124,92,255,0.15)',
              color: allDone ? '#86efac' : '#c4b5fd',
              border: allDone ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(124,92,255,0.3)',
            }}>
              {completed}/{total}
            </span>
          </div>
          <button
            onClick={() => { setVisible(false); onDismiss() }}
            className="text-xs"
            style={{ color: '#4a5568', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>

        {allDone ? (
          <p className="text-xs" style={{ color: '#86efac' }}>
            You've completed all the essentials. Explore the History page, try the Filipino language toggle, or run more analyses.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STEPS.map((s) => {
              const done = state[s.key]
              return (
                <div
                  key={s.key}
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                  style={{
                    background: done ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
                    border: done ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">{done ? '✅' : s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: done ? '#86efac' : '#cdd8ff' }}>
                      {s.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: done ? '#4ade80' : '#6b7aa3' }}>
                      {done ? 'Completed' : s.detail}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
