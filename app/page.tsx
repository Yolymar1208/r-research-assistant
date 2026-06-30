'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'
import type {
  AppStep,
  DatasetSummary,
  AnalysisPlan,
  RExecutionResult,
  AnalysisResult,
} from '@/app/types'
import DatasetSummaryPanel from '@/app/components/DatasetSummaryPanel'
import StatusIndicator from '@/app/components/StatusIndicator'
import AnalysisResults from '@/app/components/AnalysisResults'
import Starfield from '@/app/components/Starfield'

const supabase = createClient()

const SAMPLE_QUESTIONS = [
  'What is the epidemic curve of cases by date of onset?',
  'Is there a difference in age between cases who died and those who recovered?',
  'What is the attack rate among those exposed to the water source vs not exposed?',
  'What is the age-sex distribution of cases?',
]

export default function Home() {
  const [step, setStep] = useState<AppStep>('upload')
  const [datasetSummary, setDatasetSummary] = useState<DatasetSummary | null>(null)
  const [researchQuestion, setResearchQuestion] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [usage, setUsage] = useState<{ currentCount: number; limit: number; plan: string; remaining: number } | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [isDemoDataset, setIsDemoDataset] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/usage').then(r => r.json()).then(data => { if (data.success) setUsage(data) }).catch(() => {})
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserEmail(data.user.email || null) })
  }, [])

  async function handleFileUpload(file: File, isDemo = false) {
    setStep('upload'); setErrorMessage(null); setDatasetSummary(null); setAnalysisResult(null)
    setIsDemoDataset(isDemo)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success) { setErrorMessage(data.error || 'Upload failed.'); setStep('error'); return }
      setDatasetSummary(data.summary)
      setStep('inspect')
    } catch { setErrorMessage('Network error during upload.'); setStep('error') }
  }

  async function loadSampleDataset() {
    setIsLoadingDemo(true)
    try {
      const res = await fetch('/sample-datasets/outbreak_demo.xlsx')
      const blob = await res.blob()
      const file = new File([blob], 'outbreak_demo.xlsx', { type: blob.type })
      await handleFileUpload(file, true)
    } catch {
      setErrorMessage('Could not load the sample dataset. Please try uploading your own file.')
      setStep('error')
    } finally {
      setIsLoadingDemo(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) handleFileUpload(file, false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]; if (file) handleFileUpload(file, false)
  }

  async function runAnalysis() {
    if (!datasetSummary || !researchQuestion.trim()) return
    setErrorMessage(null); setAnalysisResult(null); setStep('analyzing')
    let plan: AnalysisPlan, rScript: string
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetSummary, researchQuestion, hypothesis }),
      })
      const data = await res.json()
      if (!data.success) {
        if (data.error?.startsWith('FREE_LIMIT_REACHED')) {
          const [, count, limit] = data.error.split(':')
          setErrorMessage(`FREE_LIMIT:You have used ${count} of ${limit} free analyses this month.`)
        } else { setErrorMessage(data.error || 'Analysis planning failed.') }
        setStep('error'); return
      }
      plan = data.plan; rScript = data.rScript
    } catch { setErrorMessage('Network error during analysis planning.'); setStep('error'); return }

    setStep('executing')
    try {
      const res = await fetch('/api/execute-r', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rScript, plan,
          excelFilePath: datasetSummary?.tempFilePath || '',
          datasetName: datasetSummary?.fileName || 'Unknown',
          storagePath: (datasetSummary as DatasetSummary & { storagePath?: string })?.storagePath || null,
        }),
      })
      let data: Record<string, unknown>
      try {
        data = await res.json()
      } catch (jsonErr) {
        setErrorMessage('Server returned invalid response. Please try again.')
        setStep('error')
        return
      }
      const execData = data.execution as RExecutionResult | undefined
      const rawOutput = String((execData?.rawOutput) || '').replace(/\0/g, '')
      const execErrorMsg = String((execData?.errorMessage) || String(data.error || ''))
      const execution: RExecutionResult = {
        success: Boolean(execData?.success ?? false),
        rawOutput,
        errorMessage: execErrorMsg || null,
        executionTimeMs: Number(execData?.executionTimeMs || 0),
        rScript,
      }
      const interpretation = String(data.interpretation || '').replace(/\0/g, '')
      const result: AnalysisResult = { plan, rScript, execution, aiInterpretation: interpretation, completedAt: new Date().toISOString() }
      const errorMsg = String(execution.errorMessage || (data.error ? String(data.error) : 'R execution failed'))
      setStep(execution.success ? 'complete' : 'error')
      if (!execution.success) setErrorMessage(errorMsg)
      setAnalysisResult(result)
      fetch('/api/usage').then(r => r.json()).then(d => { if (d.success) setUsage(d) }).catch(() => {})
    } catch (err) {
      setErrorMessage('Network error: ' + String(err))
      setStep('error')
    }
  }

  async function handleSignOut() { await supabase.auth.signOut(); window.location.href = '/login' }
  function reset() {
    setStep('upload'); setDatasetSummary(null); setResearchQuestion(''); setHypothesis('')
    setAnalysisResult(null); setErrorMessage(null); setIsDemoDataset(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isRunning = ['analyzing', 'executing', 'interpreting'].includes(step)
  const canRun = datasetSummary !== null && researchQuestion.trim().length > 10 && !isRunning

  return (
    <main className="min-h-screen relative" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Starfield />
      <header className="relative z-10" style={{ background: 'rgba(13, 20, 40, 0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(124,92,255,0.18)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c5cff 0%, #2e75b6 100%)', boxShadow: '0 0 0 1px rgba(124,92,255,0.4), 0 4px 14px rgba(124,92,255,0.3)' }}>
              <span className="text-white font-extrabold text-sm" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>J</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold" style={{ color: '#f1f4fc', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif', letterSpacing: '-0.3px' }}>JOANResearchOS</h1>
              <p className="text-xs mt-0.5 hidden sm:block" style={{ color: '#8b9bc4' }}>Statistical analysis powered by R · AI generates code, R computes results</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {usage && usage.plan === 'free' && (
              <div className="hidden md:flex items-center gap-2" title={`${usage.currentCount} of ${usage.limit} free analyses used this month`}>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (usage.currentCount / Math.max(1, usage.limit)) * 100)}%`, background: usage.remaining <= 1 ? '#e8b85c' : '#60a5fa' }}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: usage.remaining <= 1 ? '#e8b85c' : '#8b9bc4' }}>
                  {usage.currentCount}/{usage.limit} used
                </span>
              </div>
            )}
            {usage && usage.plan !== 'free' && (
              <span className="hidden md:inline-block text-xs font-medium px-2 py-1 rounded-full capitalize" style={{ color: '#86efac', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
                {usage.plan} plan · Unlimited
              </span>
            )}
            {datasetSummary && <button onClick={reset} className="text-xs px-2.5 py-1.5 rounded whitespace-nowrap transition-colors" style={{ color: '#aab4d4', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)' }}>Start Over</button>}
            <a href="/history" className="text-xs px-2.5 py-1.5 rounded whitespace-nowrap transition-colors" style={{ color: '#aab4d4', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)' }}>History</a>
            <a href="/landing" className="text-xs px-2.5 py-1.5 rounded whitespace-nowrap transition-colors" style={{ color: '#8fb4ff', border: '1px solid rgba(124,92,255,0.35)', background: 'rgba(124,92,255,0.08)' }}>Pricing</a>
            {userEmail && (
              <div className="flex items-center gap-2">
                <span className="text-xs hidden lg:block max-w-[140px] truncate" style={{ color: '#6b7aa3' }}>{userEmail}</span>
                <button onClick={handleSignOut} className="text-xs px-2.5 py-1.5 rounded whitespace-nowrap" style={{ color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)' }}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6 relative z-10">
        {usage && usage.plan === 'free' && usage.remaining <= 1 && (
          <div className="rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'rgba(232,184,92,0.08)', border: '1px solid rgba(232,184,92,0.3)' }}>
            <p className="text-sm" style={{ color: '#e8b85c' }}>
              {usage.remaining === 0
                ? `You've used all ${usage.limit} free analyses this month.`
                : `You have ${usage.remaining} free analysis left this month.`}
            </p>
            <a href="/landing#pricing" className="text-xs font-semibold px-3 py-1.5 rounded whitespace-nowrap" style={{ color: '#1a1408', background: '#e8b85c' }}>
              View Pro plan →
            </a>
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ color: '#aab4d4' }}>1. Upload Dataset</h2>
            {!datasetSummary && (
              <button
                onClick={loadSampleDataset}
                disabled={isLoadingDemo}
                className="text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                style={{ color: '#c4b5fd', background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.35)' }}
              >
                {isLoadingDemo ? 'Loading sample…' : '▶ Try a sample outbreak dataset'}
              </button>
            )}
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
            style={{
              borderColor: isDragging ? '#60a5fa' : datasetSummary ? (isDemoDataset ? '#7c5cff' : '#4ade80') : 'rgba(255,255,255,0.16)',
              background: isDragging ? 'rgba(96,165,250,0.08)' : datasetSummary ? (isDemoDataset ? 'rgba(124,92,255,0.06)' : 'rgba(74,222,128,0.06)') : 'rgba(255,255,255,0.03)',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
            {datasetSummary ? (
              <div>
                <p className="font-medium" style={{ color: isDemoDataset ? '#c4b5fd' : '#86efac' }}>
                  {isDemoDataset ? '▶ Sample dataset loaded — ' : '✓ '}{datasetSummary.fileName}
                </p>
                <p className="text-xs mt-1" style={{ color: isDemoDataset ? '#a78bfa' : '#4ade80' }}>{datasetSummary.rowCount.toLocaleString()} rows · {datasetSummary.columnCount} columns</p>
                <p className="text-xs mt-2" style={{ color: '#6b7aa3' }}>Click to upload a different file</p>
              </div>
            ) : (
              <div>
                <p className="font-medium" style={{ color: '#cdd8ff' }}>Drop Excel file here or click to browse</p>
                <p className="text-xs mt-1" style={{ color: '#6b7aa3' }}>.xlsx or .xls · max 50MB</p>
                <p className="text-xs mt-1" style={{ color: '#6b7aa3' }}>New here? Use the sample dataset above to try a full analysis with no upload needed.</p>
              </div>
            )}
          </div>
        </section>

        {datasetSummary && (
          <section>
            <h2 className="text-sm font-semibold mb-2" style={{ color: '#aab4d4' }}>2. Dataset Inspection</h2>
            <div className="rounded-lg p-px" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.3), rgba(46,117,182,0.2))' }}>
              <div className="rounded-lg overflow-hidden bg-white">
                <DatasetSummaryPanel summary={datasetSummary} />
              </div>
            </div>
          </section>
        )}

        {datasetSummary && (
          <section>
            <h2 className="text-sm font-semibold mb-2" style={{ color: '#aab4d4' }}>3. Research Question</h2>
            <div className="rounded-lg p-4 space-y-4" style={{ background: 'rgba(18,26,48,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(124,92,255,0.2)' }}>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#cdd8ff' }}>What do you want to find out?</label>
                <textarea value={researchQuestion} onChange={(e) => setResearchQuestion(e.target.value)} placeholder="e.g. What is the epidemic curve of COVID-19 cases by symptom onset date?" rows={3} className="w-full rounded px-3 py-2 text-sm resize-none focus:outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)', color: '#e8ecf5' }} />
                <p className="text-xs mt-1" style={{ color: '#6b7aa3' }}>Write it like you'd ask a biostatistician — plain language, no need to name a specific test.</p>
                {isDemoDataset && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SAMPLE_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => setResearchQuestion(q)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: '#c4b5fd', background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.3)' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#cdd8ff' }}>Hypothesis <span className="font-normal" style={{ color: '#6b7aa3' }}>(optional)</span></label>
                <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="e.g. Cases peaked in week 2." rows={2} className="w-full rounded px-3 py-2 text-sm resize-none focus:outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)', color: '#e8ecf5' }} />
              </div>
            </div>
          </section>
        )}

        {datasetSummary && (
          <section>
            <h2 className="text-sm font-semibold mb-2" style={{ color: '#aab4d4' }}>4. Analysis Status</h2>
            <div className="rounded-lg p-px" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.3), rgba(46,117,182,0.2))' }}>
              <div className="rounded-lg overflow-hidden bg-white">
                <StatusIndicator step={step} errorMessage={errorMessage} />
              </div>
            </div>
          </section>
        )}

        {datasetSummary && (
          <section>
            <button
              onClick={runAnalysis}
              disabled={!canRun}
              className="w-full py-3 px-6 rounded-lg text-sm font-semibold transition-all"
              style={canRun
                ? { color: '#fff', background: 'linear-gradient(135deg, #7c5cff 0%, #2e75b6 100%)', boxShadow: '0 4px 20px rgba(124,92,255,0.35)' }
                : { color: '#5a6890', background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  {step === 'analyzing' ? 'AI creating analysis plan…' : step === 'executing' ? 'R running (may take up to 30s)…' : 'AI interpreting…'}
                </span>
              ) : 'Generate Analysis'}
            </button>
          </section>
        )}

        {analysisResult && (
          <section>
            <h2 className="text-sm font-semibold mb-2" style={{ color: '#aab4d4' }}>5. Results</h2>
            <div className="rounded-lg p-px" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.3), rgba(46,117,182,0.2))' }}>
              <div className="rounded-lg overflow-hidden bg-white">
                <AnalysisResults result={analysisResult} />
              </div>
            </div>
          </section>
        )}

        {step === 'error' && !analysisResult && errorMessage && (
          <section className="rounded-lg p-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}>
            <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>Error</p>
            <p className="text-sm mt-1" style={{ color: '#fca5a5' }}>{errorMessage.replace('FREE_LIMIT:', '')}</p>
            {errorMessage.startsWith('FREE_LIMIT:') ? (
              <a href="/landing#pricing" className="mt-3 inline-block text-xs px-3 py-1.5 rounded font-medium" style={{ color: '#fff', background: 'linear-gradient(135deg, #7c5cff 0%, #2e75b6 100%)' }}>
                Upgrade to Pro — unlimited analyses
              </a>
            ) : (
              <button onClick={runAnalysis} className="mt-3 text-xs px-3 py-1.5 rounded" style={{ color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' }}>Try Again</button>
            )}
          </section>
        )}
      </div>

      <footer className="relative z-10 mt-16 py-6" style={{ borderTop: '1px solid rgba(124,92,255,0.15)' }}>
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-2">
          <p className="text-center text-xs" style={{ color: '#5a6890' }}>JOANResearchOS · Statistical Engine: R · AI generates code, R computes all statistical results</p>
          <div className="flex items-center gap-3 text-xs" style={{ color: '#5a6890' }}>
            <a href="/privacy" className="hover:text-gray-300">Privacy Policy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-gray-300">Terms of Service</a>
            <span>·</span>
            <a href="mailto:antetokounmpo8@gmail.com" className="hover:text-gray-300">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
