'use client'

import type { AppStep } from '@/app/types'

interface Props {
  step: AppStep
  errorMessage?: string | null
}

const STEPS: { key: AppStep; label: string; description: string }[] = [
  { key: 'upload', label: 'Upload', description: 'Upload Excel file' },
  { key: 'inspect', label: 'Inspect', description: 'Dataset inspected' },
  { key: 'question', label: 'Question', description: 'Research question entered' },
  { key: 'analyzing', label: 'AI Planning', description: 'AI creating analysis plan' },
  { key: 'executing', label: 'R Running', description: 'R executing script' },
  { key: 'interpreting', label: 'Interpreting', description: 'AI interpreting results' },
  { key: 'complete', label: 'Complete', description: 'Analysis complete' },
]

const STEP_ORDER: AppStep[] = [
  'upload', 'inspect', 'question', 'analyzing', 'executing', 'interpreting', 'complete'
]

function getStepIndex(step: AppStep): number {
  return STEP_ORDER.indexOf(step)
}

export default function StatusIndicator({ step, errorMessage }: Props) {
  const currentIndex = getStepIndex(step)
  const isError = step === 'error'

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Analysis Status</h2>
        {(step === 'analyzing' || step === 'executing' || step === 'interpreting') && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        )}
      </div>

      {isError ? (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm font-medium text-red-700">Error</p>
          {errorMessage && (
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {STEPS.filter(s => s.key !== 'question').map((s, i, arr) => {
            const sIndex = getStepIndex(s.key)
            const isDone = sIndex < currentIndex
            const isCurrent = sIndex === currentIndex
            const isPending = sIndex > currentIndex

            return (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isDone
                        ? 'bg-green-500 border-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {isDone ? '✓' : isCurrent && (step === 'analyzing' || step === 'executing' || step === 'interpreting') ? '…' : sIndex + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 whitespace-nowrap ${
                      isDone ? 'text-green-600' : isCurrent ? 'text-blue-600 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className={`h-0.5 w-6 mx-1 mb-5 transition-all ${
                      sIndex < currentIndex ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Current status message */}
      <div className="mt-3 text-xs text-gray-500">
        {step === 'upload' && 'Waiting for file upload'}
        {step === 'inspect' && 'Dataset loaded — enter your research question below'}
        {step === 'question' && 'Ready to generate analysis'}
        {step === 'analyzing' && 'AI is reading your dataset and selecting the appropriate test…'}
        {step === 'executing' && 'R is running the statistical analysis…'}
        {step === 'interpreting' && 'AI is interpreting the R output…'}
        {step === 'complete' && 'Analysis complete — see results below'}
        {step === 'error' && 'Check error details below'}
      </div>
    </div>
  )
}
