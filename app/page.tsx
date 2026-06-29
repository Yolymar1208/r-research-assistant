'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase'
import type { AppStep, DatasetSummary, AnalysisPlan, RExecutionResult, AnalysisResult } from '@/app/types'
import DatasetSummaryPanel from '@/app/components/DatasetSummaryPanel'
import StatusIndicator from '@/app/components/StatusIndicator'
import AnalysisResults from '@/app/components/AnalysisResults'

const supabase = createClient()

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/usage').then(r => r.json()).then(data => { if (data.success) setUsage(data) }).catch(() => {})
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserEmail(data.user.email || null) })
  }, [])

  async function handleFileUpload(file: File) {
    setStep('upload'); setErrorMessage(null); setDatasetSummary(null); setAnalysisResult(null)
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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) handleFileUpload(file)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]; if (file) handleFileUpload(file)
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
      const data = await res.json()
      const execution: RExecutionResult = data.execution || { success: false, rawOutput: '', errorMessage: data.error || 'Execution failed', executionTimeMs: 0, rScript }
      const result: AnalysisResult = { plan, rScript, execution, aiInterpretation: data.interpretation || '', completedAt: new Date().toISOString() }
      setAnalysisResult(result)
      setStep(execution.success ? 'complete' : 'error')
      if (!execution.success) setErrorMessage(execution.errorMessage)
      fetch('/api/usage').then(r => r.json()).then(data => { if (data.success) setUsage(data) }).catch(() => {})
    } catch { setErrorMessage('Network error during R execution.'); setStep('error') }
  }

  async function handleSignOut() { await supabase.auth.signOut(); window.location.href = '/login' }
  function reset() {
    setStep('upload'); setDatasetSummary(null); setResearchQuestion(''); setHypothesis('')
    setAnalysisResult(null); setErrorMessage(null); fileB64Ref.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isRunning = ['analyzing', 'executing', 'interpreting'].includes(step)
  const canRun = datasetSummary !== null && researchQuestion.trim().length > 10 && !isRunning

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">JOANResearchOS</h1>
            <p className="text-xs text-gray-500 mt-0.5">Statistical analysis powered by R · AI generates code, R computes results</p>
          </div>
          <div className="flex items-center gap-3">
            {datasetSummary && <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50">Start Over</button>}
            <a href="/history" className="text-xs text-gray-600 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50">History</a>
            <a href="/landing" className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50">Pricing</a>
            {userEmail && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden sm:block">{userEmail}</span>
                <button onClick={handleSignOut} className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">1. Upload Dataset</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-400 bg-blue-50' : datasetSummary ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}`}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
            {datasetSummary ? (
              <div>
                <p className="text-green-700 font-medium">✓ {datasetSummary.fileName}</p>
                <p className="text-xs text-green-600 mt-1">{datasetSummary.rowCount.toLocaleString()} rows · {datasetSummary.columnCount} columns</p>
                <p className="text-xs text-gray-400 mt-2">Click to upload a different file</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 font-medium">Drop Excel file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx or .xls · max 50MB</p>
              </div>
            )}
          </div>
        </section>

        {datasetSummary && <section><h2 className="text-sm font-semibold text-gray-700 mb-2">2. Dataset Inspection</h2><DatasetSummaryPanel summary={datasetSummary} /></section>}

        {datasetSummary && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">3. Research Question</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What do you want to find out?</label>
                <textarea value={researchQuestion} onChange={(e) => setResearchQuestion(e.target.value)} placeholder="e.g. Is there a significant difference in hospital stay days between patients with and without comorbidities?" rows={3} className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hypothesis <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="e.g. Patients with comorbidities will have significantly longer hospital stays." rows={2} className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
            </div>
          </section>
        )}

        {datasetSummary && <section><h2 className="text-sm font-semibold text-gray-700 mb-2">4. Analysis Status</h2><StatusIndicator step={step} errorMessage={errorMessage} /></section>}

        {datasetSummary && usage && usage.plan === 'free' && (
          <section>
            <div style={{ background: usage.remaining === 0 ? '#fef2f2' : usage.remaining <= 2 ? '#fffbe6' : '#f0f9ff', border: `1px solid ${usage.remaining === 0 ? '#fecaca' : usage.remaining <= 2 ? '#fde68a' : '#bae6fd'}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: usage.remaining === 0 ? '#991b1b' : usage.remaining <= 2 ? '#92400e' : '#0369a1' }}>
                {usage.remaining === 0 ? '⚠ Free limit reached' : `${usage.remaining} of ${usage.limit} free analyses remaining this month`}
              </span>
              {usage.remaining === 0 && <a href="/landing#pricing" style={{ fontSize: '12px', fontWeight: 600, color: '#fff', background: '#1a3a5c', padding: '4px 12px', borderRadius: '6px', textDecoration: 'none' }}>Upgrade</a>}
            </div>
          </section>
        )}

        {datasetSummary && (
          <section>
            <button onClick={runAnalysis} disabled={!canRun} className={`w-full py-3 px-6 rounded-lg text-sm font-semibold transition-all ${canRun ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  {step === 'analyzing' ? 'AI creating analysis plan…' : step === 'executing' ? 'R running…' : 'AI interpreting…'}
                </span>
              ) : 'Generate Analysis'}
            </button>
            {!researchQuestion.trim() && <p className="text-xs text-gray-400 text-center mt-2">Enter a research question to continue</p>}
          </section>
        )}

        {analysisResult && <section><h2 className="text-sm font-semibold text-gray-700 mb-2">5. Results</h2><AnalysisResults result={analysisResult} /></section>}

        {step === 'error' && !analysisResult && errorMessage && (
          <section className={errorMessage.startsWith('FREE_LIMIT:') ? 'bg-amber-50 border border-amber-200 rounded-lg p-4' : 'bg-red-50 border border-red-200 rounded-lg p-4'}>
            <p className="text-sm font-medium text-red-700">Error</p>
            <p className="text-sm text-red-600 mt-1">{errorMessage.replace('FREE_LIMIT:', '')}</p>
            {errorMessage.startsWith('FREE_LIMIT:') ? (
              <a href="/landing#pricing" className="mt-3 inline-block text-xs text-white bg-blue-600 px-3 py-1.5 rounded">View pricing →</a>
            ) : (
              <button onClick={runAnalysis} className="mt-3 text-xs text-red-700 border border-red-300 px-3 py-1.5 rounded">Try Again</button>
            )}
          </section>
        )}
      </div>

      <footer className="border-t border-gray-200 mt-16 py-6">
        <p className="text-center text-xs text-gray-400">JOANResearchOS · Statistical Engine: R · AI generates code, R computes all statistical results</p>
      </footer>
    </main>
  )
}
