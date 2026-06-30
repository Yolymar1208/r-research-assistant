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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">1. Upload Dataset</h2>
            {!datasetSummary && (
              <button
                onClick={loadSampleDataset}
                disabled={isLoadingDemo}
                className="text-xs text-violet-700 border border-violet-200 bg-violet-50 px-3 py-1.5 rounded hover:bg-violet-100 font-medium disabled:opacity-50"
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
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-400 bg-blue-50' : datasetSummary ? (isDemoDataset ? 'border-violet-300 bg-violet-50' : 'border-green-300 bg-green-50') : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}`}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
            {datasetSummary ? (
              <div>
                <p className={`font-medium ${isDemoDataset ? 'text-violet-700' : 'text-green-700'}`}>
                  {isDemoDataset ? '▶ Sample dataset loaded — ' : '✓ '}{datasetSummary.fileName}
                </p>
                <p className={`text-xs mt-1 ${isDemoDataset ? 'text-violet-600' : 'text-green-600'}`}>{datasetSummary.rowCount.toLocaleString()} rows · {datasetSummary.columnCount} columns</p>
                <p className="text-xs text-gray-400 mt-2">Click to upload a different file</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 font-medium">Drop Excel file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx or .xls · max 50MB</p>
                <p className="text-xs text-gray-400 mt-1">New here? Use the sample dataset above to try a full analysis with no upload needed.</p>
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
                <textarea value={researchQuestion} onChange={(e) => setResearchQuestion(e.target.value)} placeholder="e.g. What is the epidemic curve of COVID-19 cases by symptom onset date?" rows={3} className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                <p className="text-xs text-gray-400 mt-1">Write it like you'd ask a biostatistician — plain language, no need to name a specific test.</p>
                {isDemoDataset && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SAMPLE_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => setResearchQuestion(q)}
                        className="text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded hover:bg-violet-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hypothesis <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="e.g. Cases peaked in week 2." rows={2} className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
            </div>
          </section>
        )}

        {datasetSummary && <section><h2 className="text-sm font-semibold text-gray-700 mb-2">4. Analysis Status</h2><StatusIndicator step={step} errorMessage={errorMessage} /></section>}

        {datasetSummary && (
          <section>
            <button onClick={runAnalysis} disabled={!canRun} className={`w-full py-3 px-6 rounded-lg text-sm font-semibold transition-all ${canRun ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
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
            <h2 className="text-sm font-semibold text-gray-700 mb-2">5. Results</h2>
            <AnalysisResults result={analysisResult} />
          </section>
        )}

        {step === 'error' && !analysisResult && errorMessage && (
          <section className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-700">Error</p>
            <p className="text-sm text-red-600 mt-1">{errorMessage.replace('FREE_LIMIT:', '')}</p>
            <button onClick={runAnalysis} className="mt-3 text-xs text-red-700 border border-red-300 px-3 py-1.5 rounded">Try Again</button>
          </section>
        )}
      </div>

      <footer className="border-t border-gray-200 mt-16 py-6">
        <p className="text-center text-xs text-gray-400">JOANResearchOS · Statistical Engine: R · AI generates code, R computes all statistical results</p>
      </footer>
    </main>
  )
}
