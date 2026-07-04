'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import Starfield from '@/app/components/Starfield'
import { detectSource, SOURCE_OPTIONS } from '@/app/lib/sourceDetector'
import { classifyColumns } from '@/app/lib/phiDetector'
import {
  generateCleaningSteps,
  applyCleaningSteps,
} from '@/app/lib/lineListCleaner'
import type { DataSource, SourceDetectionResult } from '@/app/lib/sourceDetector'
import type { ColumnClassification } from '@/app/lib/phiDetector'
import type { CleaningStep, RawRow, AISuggestion } from '@/app/lib/lineListCleaner'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS = ['Upload', 'De-identify', 'Clean', 'Export']

const glass: React.CSSProperties = {
  background: 'rgba(18,26,48,0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(124,92,255,0.2)',
  borderRadius: '14px',
}

export default function CleanPage() {
  const [step, setStep] = useState<Step>(1)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<RawRow[]>([])
  const [allColumns, setAllColumns] = useState<string[]>([])

  // Step 1
  const [detectedSource, setDetectedSource] = useState<SourceDetectionResult | null>(null)
  const [selectedSource, setSelectedSource] = useState<DataSource>('generic')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2
  const [columnClassifications, setColumnClassifications] = useState<ColumnClassification[]>([])
  const [keepCols, setKeepCols] = useState<Set<string>>(new Set())
  const [removeCols, setRemoveCols] = useState<Set<string>>(new Set())
  const [deidentConfirmed, setDeidentConfirmed] = useState(false)
  const [birthdayColumn, setBirthdayColumn] = useState<string | null>(null)

  // Step 3
  const [cleaningSteps, setCleaningSteps] = useState<CleaningStep[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState('')

  // Step 4
  const [cleanedRows, setCleanedRows] = useState<RawRow[]>([])
  const [isApplying, setIsApplying] = useState(false)

  // ─── File upload ──────────────────────────────────────────────────────────────

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: null, raw: false })
      if (rawRows.length === 0) return

      const cols = Object.keys(rawRows[0])
      const detection = detectSource(cols)

      setFileName(file.name)
      setRows(rawRows)
      setAllColumns(cols)
      setDetectedSource(detection)
      setSelectedSource(detection.source)
    }
    reader.readAsArrayBuffer(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }

  function proceedToDeidentify() {
    const classifications = classifyColumns(allColumns)
    setColumnClassifications(classifications)
    const keep = new Set(classifications.filter(c => c.classification === 'keep').map(c => c.name))
    const remove = new Set(classifications.filter(c => c.classification !== 'keep').map(c => c.name))
    setKeepCols(keep)
    setRemoveCols(remove)
    // Detect birthday column for age conversion offer
    const bday = classifications.find(c => c.specialAction === 'convert_age')
    setBirthdayColumn(bday?.name ?? null)
    setStep(2)
  }

  // ─── Step 2 column drag ────────────────────────────────────────────────────────

  function moveToKeep(colName: string) {
    setRemoveCols(prev => { const s = new Set(Array.from(prev)); s.delete(colName); return s })
    setKeepCols(prev => new Set([...Array.from(prev), colName]))
  }

  function moveToRemove(colName: string) {
    setKeepCols(prev => { const s = new Set(Array.from(prev)); s.delete(colName); return s })
    setRemoveCols(prev => new Set([...Array.from(prev), colName]))
  }

  async function proceedToCleaning() {
    setStep(3)
    setIsLoadingSuggestions(true)
    setSuggestionsError('')

    // Build column profiles — column names + value distributions ONLY
    // Row-level data is never sent to the API
    const keepColsArr = Array.from(keepCols)
    const columnProfiles = keepColsArr.map(col => {
      const vals = rows.map(r => String(r[col] ?? '')).filter(Boolean)
      const uniqueVals = [...new Set(vals)].slice(0, 10)
      const missingCount = rows.filter(r => !r[col] && r[col] !== 0).length
      return {
        name: col,
        type: typeof rows[0]?.[col] === 'number' ? 'numeric' : 'character',
        uniqueValues: uniqueVals,
        sampleCount: rows.length,
        missingCount,
      }
    })

    let aiSuggestions: AISuggestion[] = []
    try {
      const res = await fetch('/api/suggest-cleaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: selectedSource,
          rowCount: rows.length,
          columnProfiles,
        }),
      })
      const data = await res.json()
      if (data.success) aiSuggestions = data.suggestions
    } catch {
      setSuggestionsError('Could not load AI suggestions — you can still apply manual cleaning steps below.')
    } finally {
      setIsLoadingSuggestions(false)
    }

    const steps = generateCleaningSteps(
      rows,
      Array.from(keepCols),
      Array.from(removeCols),
      birthdayColumn,
      selectedSource,
      aiSuggestions
    )
    setCleaningSteps(steps)
  }

  function updateStepStatus(id: string, status: CleaningStep['status']) {
    setCleaningSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  function acceptAll() {
    setCleaningSteps(prev => prev.map(s => s.status === 'pending' ? { ...s, status: 'accepted' } : s))
  }

  async function applyAndProceed() {
    setIsApplying(true)
    const accepted = cleaningSteps.map(s =>
      s.status === 'pending' ? { ...s, status: 'accepted' as const } : s
    )
    // Run in a microtask to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 50))
    const cleaned = applyCleaningSteps(rows, accepted)
    setCleanedRows(cleaned)
    setIsApplying(false)
    setStep(4)
  }

  // ─── Step 4 export ─────────────────────────────────────────────────────────────

  function downloadCleanFile() {
    const ws = XLSX.utils.json_to_sheet(cleanedRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Line List')
    XLSX.writeFile(wb, `clean_${fileName || 'linelist'}.xlsx`)
  }

  function analyzeInApp() {
    // Convert cleaned rows to a Blob and redirect to main app with the file
    const ws = XLSX.utils.json_to_sheet(cleanedRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Line List')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    // Store in sessionStorage for the main page to pick up
    sessionStorage.setItem('cleanedFileBlob', url)
    sessionStorage.setItem('cleanedFileName', `clean_${fileName || 'linelist'}.xlsx`)
    window.location.href = '/?from_cleaner=1'
  }

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: '100vh', position: 'relative', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Starfield />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, background: 'rgba(13,20,40,0.7)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(124,92,255,0.18)', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', boxShadow: '0 0 0 1px rgba(124,92,255,0.4)' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>J</span>
            </div>
            <div>
              <span style={{ color: '#f1f4fc', fontWeight: 700, fontSize: '15px' }}>JOANResearchOS</span>
              <span style={{ color: '#6b7aa3', fontSize: '12px', marginLeft: '8px' }}>Line List Builder</span>
            </div>
          </div>
          <a href="/" style={{ fontSize: '13px', color: '#8fb4ff', textDecoration: 'none', border: '1px solid rgba(124,92,255,0.3)', padding: '6px 14px', borderRadius: '8px', background: 'rgba(124,92,255,0.08)' }}>
            ← Back to analysis
          </a>
        </div>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 1.5rem', position: 'relative', zIndex: 10 }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
          {STEP_LABELS.map((label, i) => {
            const num = i + 1
            const isDone = step > num
            const isCurrent = step === num
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, background: isDone ? '#4ade80' : isCurrent ? 'linear-gradient(135deg,#7c5cff,#2e75b6)' : 'rgba(255,255,255,0.06)', color: isDone || isCurrent ? '#fff' : '#6b7aa3', border: isDone ? 'none' : isCurrent ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
                    {isDone ? '✓' : num}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 400, color: isDone ? '#4ade80' : isCurrent ? '#c4b5fd' : '#6b7aa3', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {i < 3 && <div style={{ flex: 1, height: '1px', background: isDone ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)', margin: '0 12px' }} />}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={glass}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 style={{ color: '#f1f4fc', fontWeight: 700, fontSize: '16px', margin: '0 0 4px' }}>Upload raw data file</h2>
                <p style={{ color: '#8b9bc4', fontSize: '13px', margin: 0 }}>Supports KoboToolbox, PIDSR, Google Forms, REDCap, Hospital EMR, and manual Excel exports</p>
              </div>
              <div style={{ padding: '24px' }}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `2px dashed ${isDragging ? '#7c5cff' : fileName ? '#4ade80' : 'rgba(255,255,255,0.18)'}`, borderRadius: '10px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(124,92,255,0.06)' : fileName ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.15s' }}
                >
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} style={{ display: 'none' }} />
                  {fileName ? (
                    <div>
                      <p style={{ color: '#86efac', fontWeight: 600, margin: '0 0 4px' }}>✓ {fileName}</p>
                      <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>{rows.length.toLocaleString()} rows · {allColumns.length} columns</p>
                      <p style={{ color: '#6b7aa3', fontSize: '12px', margin: '8px 0 0' }}>Click to choose a different file</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: '#cdd8ff', fontWeight: 600, margin: '0 0 6px', fontSize: '15px' }}>Drop your raw data file here</p>
                      <p style={{ color: '#6b7aa3', fontSize: '13px', margin: 0 }}>.xlsx, .xls, or .csv</p>
                    </div>
                  )}
                </div>

                {detectedSource && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.25)', borderRadius: '10px' }}>
                    <p style={{ fontSize: '12px', color: '#8b9bc4', margin: '0 0 6px' }}>
                      Detected source: <strong style={{ color: '#c4b5fd' }}>{detectedSource.label}</strong>
                      {' '}({detectedSource.confidence} confidence)
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7aa3' }}>Correct?</span>
                      <select
                        value={selectedSource}
                        onChange={e => setSelectedSource(e.target.value as DataSource)}
                        style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', background: 'rgba(13,20,40,0.8)', color: '#e8ecf5' }}
                      >
                        {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    {detectedSource.metadataColumns.length > 0 && (
                      <p style={{ fontSize: '11px', color: '#6b7aa3', margin: '6px 0 0' }}>
                        Will auto-remove: {detectedSource.metadataColumns.slice(0, 5).join(', ')}{detectedSource.metadataColumns.length > 5 ? ` +${detectedSource.metadataColumns.length - 5} more` : ''}
                      </p>
                    )}
                  </div>
                )}

                {fileName && (
                  <button
                    onClick={proceedToDeidentify}
                    style={{ marginTop: '16px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#fff', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', boxShadow: '0 4px 16px rgba(124,92,255,0.3)' }}
                  >
                    Next: De-identify →
                  </button>
                )}
              </div>
            </div>

            <div style={{ ...glass, padding: '16px 20px' }}>
              <p style={{ fontSize: '12px', color: '#6b7aa3', margin: 0, lineHeight: 1.6 }}>
                🔒 <strong style={{ color: '#aab4d4' }}>Privacy guarantee:</strong> Your raw data never leaves your device during the cleaning and de-identification process. Only column names and value counts are sent to AI for suggestions. The cleaned, de-identified file is what gets uploaded to JOANResearchOS.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: De-identify ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ ...glass, padding: '16px 20px', background: 'rgba(254,243,199,0.08)', border: '1px solid rgba(253,230,138,0.3)' }}>
              <p style={{ fontSize: '13px', color: '#fbbf24', margin: 0, fontWeight: 600 }}>
                ⚠ De-identification Required
              </p>
              <p style={{ fontSize: '12px', color: '#d97706', margin: '4px 0 0', lineHeight: 1.5 }}>
                Review the columns below. Move any identifying information to REMOVE before proceeding. PHI never leaves your device during this step.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* REMOVE column */}
              <div style={glass}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#fca5a5' }}>🔴 REMOVE ({removeCols.size})</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7aa3' }}>PHI and system metadata</p>
                </div>
                <div style={{ padding: '12px', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Array.from(removeCols).map(col => {
                    const cls = columnClassifications.find(c => c.name === col)
                    return (
                      <div key={col} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', gap: '8px' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col}</p>
                          {cls?.specialAction === 'convert_age' && (
                            <button onClick={() => setBirthdayColumn(col)} style={{ fontSize: '10px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
                              → Convert to age instead
                            </button>
                          )}
                        </div>
                        <button onClick={() => moveToKeep(col)} style={{ fontSize: '10px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}>Keep →</button>
                      </div>
                    )
                  })}
                  {removeCols.size === 0 && <p style={{ fontSize: '12px', color: '#6b7aa3', textAlign: 'center', padding: '20px 0' }}>No columns to remove</p>}
                </div>
              </div>

              {/* KEEP column */}
              <div style={glass}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.04)' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#86efac' }}>🟢 KEEP ({keepCols.size})</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7aa3' }}>Analysis data — no PHI</p>
                </div>
                <div style={{ padding: '12px', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Array.from(keepCols).map(col => (
                    <div key={col} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '6px', gap: '8px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#86efac', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col}</p>
                      <button onClick={() => moveToRemove(col)} style={{ fontSize: '10px', color: '#fca5a5', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}>← Remove</button>
                    </div>
                  ))}
                  {keepCols.size === 0 && <p style={{ fontSize: '12px', color: '#6b7aa3', textAlign: 'center', padding: '20px 0' }}>No columns selected</p>}
                </div>
              </div>
            </div>

            {/* Confirmation checkbox */}
            <div style={{ ...glass, padding: '16px 20px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deidentConfirmed}
                  onChange={e => setDeidentConfirmed(e.target.checked)}
                  style={{ marginTop: '2px', flexShrink: 0, width: '16px', height: '16px', accentColor: '#7c5cff' }}
                />
                <span style={{ fontSize: '13px', color: '#cdd8ff', lineHeight: 1.5 }}>
                  I confirm I have reviewed the columns above. The <strong style={{ color: '#86efac' }}>KEEP</strong> columns contain no directly identifying patient information (no names, birthdates, exact addresses, contact numbers, or government ID numbers).
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)} style={{ padding: '11px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#aab4d4', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                ← Back
              </button>
              <button
                onClick={proceedToCleaning}
                disabled={!deidentConfirmed || keepCols.size === 0}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', cursor: !deidentConfirmed || keepCols.size === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', color: '#fff', background: !deidentConfirmed || keepCols.size === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #7c5cff, #2e75b6)', opacity: !deidentConfirmed || keepCols.size === 0 ? 0.5 : 1 }}
              >
                Next: Clean data →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Clean ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={glass}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ color: '#f1f4fc', fontWeight: 700, fontSize: '15px', margin: '0 0 2px' }}>Cleaning suggestions</h2>
                  <p style={{ color: '#8b9bc4', fontSize: '12px', margin: 0 }}>Review each step — accept, skip, or edit. All cleaning runs in your browser.</p>
                </div>
                {cleaningSteps.length > 0 && (
                  <button onClick={acceptAll} style={{ fontSize: '12px', color: '#86efac', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Accept all
                  </button>
                )}
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {isLoadingSuggestions && (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#8b9bc4' }}>
                    <div style={{ fontSize: '12px' }}>AI is analyzing column patterns…</div>
                  </div>
                )}
                {suggestionsError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', fontSize: '12px', color: '#fbbf24' }}>
                    {suggestionsError}
                  </div>
                )}
                {!isLoadingSuggestions && cleaningSteps.map(s => (
                  <div key={s.id} style={{ padding: '14px 16px', background: s.status === 'accepted' ? 'rgba(74,222,128,0.06)' : s.status === 'skipped' ? 'rgba(255,255,255,0.02)' : 'rgba(124,92,255,0.06)', border: `1px solid ${s.status === 'accepted' ? 'rgba(74,222,128,0.25)' : s.status === 'skipped' ? 'rgba(255,255,255,0.08)' : 'rgba(124,92,255,0.2)'}`, borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: s.status === 'skipped' ? '#6b7aa3' : '#f1f4fc' }}>{s.title}</p>
                        <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#8b9bc4' }}>{s.description}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#6b7aa3', fontFamily: 'monospace' }}>{s.detail}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {s.status === 'pending' && (
                          <>
                            <button onClick={() => updateStepStatus(s.id, 'accepted')} style={{ fontSize: '12px', fontWeight: 600, color: '#86efac', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>✓ Accept</button>
                            <button onClick={() => updateStepStatus(s.id, 'skipped')} style={{ fontSize: '12px', color: '#6b7aa3', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>Skip</button>
                          </>
                        )}
                        {s.status === 'accepted' && <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 700 }}>✓ Accepted</span>}
                        {s.status === 'skipped' && <button onClick={() => updateStepStatus(s.id, 'pending')} style={{ fontSize: '11px', color: '#6b7aa3', background: 'none', border: 'none', cursor: 'pointer' }}>Undo</button>}
                      </div>
                    </div>
                  </div>
                ))}
                {!isLoadingSuggestions && cleaningSteps.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#8b9bc4' }}>
                    <p style={{ margin: 0 }}>No cleaning steps suggested — your data looks clean!</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(2)} style={{ padding: '11px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#aab4d4', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                ← Back
              </button>
              <button
                onClick={applyAndProceed}
                disabled={isApplying || isLoadingSuggestions}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', cursor: isApplying || isLoadingSuggestions ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', color: '#fff', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', opacity: isApplying || isLoadingSuggestions ? 0.7 : 1 }}
              >
                {isApplying ? 'Applying…' : 'Apply & preview →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Preview & Export ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ ...glass, padding: '16px 20px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.3)' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#86efac' }}>
                ✓ Line list ready — {cleanedRows.length.toLocaleString()} rows · {Object.keys(cleanedRows[0] || {}).length} columns · De-identified
              </p>
            </div>

            {/* Preview table */}
            <div style={{ ...glass, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#aab4d4', fontWeight: 600 }}>Preview (first 5 rows)</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(228,236,248,0.95)' }}>
                      {Object.keys(cleanedRows[0] || {}).map(col => (
                        <th key={col} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600, color: '#4a6080', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(180,200,230,0.5)' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cleanedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(240,244,250,0.97)' : 'rgba(232,239,250,0.95)' }}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{ padding: '6px 12px', color: val === null ? '#8098b8' : '#1a2a3a', whiteSpace: 'nowrap' }}>
                            {val === null ? '—' : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <button
                onClick={downloadCleanFile}
                style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f1f4fc', cursor: 'pointer', fontWeight: 600, fontSize: '14px', textAlign: 'center' }}
              >
                ↓ Download clean line list<br />
                <span style={{ fontSize: '11px', color: '#6b7aa3', fontWeight: 400 }}>Save as .xlsx to your device</span>
              </button>
              <button
                onClick={analyzeInApp}
                style={{ padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #7c5cff, #2e75b6)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px', textAlign: 'center', boxShadow: '0 4px 16px rgba(124,92,255,0.3)' }}
              >
                → Analyze in JOANResearchOS<br />
                <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>No re-upload needed</span>
              </button>
            </div>

            <button onClick={() => { setStep(1); setFileName(''); setRows([]); setAllColumns([]); setDetectedSource(null); setCleanedRows([]) }}
              style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#6b7aa3', cursor: 'pointer', fontSize: '13px' }}>
              Clean another file
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
