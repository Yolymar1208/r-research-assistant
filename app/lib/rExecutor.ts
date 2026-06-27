import * as fs from 'fs'
import type { RExecutionResult } from '@/app/types'

// ─── Configuration ─────────────────────────────────────────────────────────────
// In production (Vercel): uses R_API_URL environment variable → Render.com
// In development (local): uses R_EXECUTABLE_PATH → local Rscript

const R_API_URL = process.env.R_API_URL?.replace(/\/$/, '') // trim trailing slash
const IS_PRODUCTION = !!R_API_URL

// ─── Wake Up the R API (Render free tier sleeps after inactivity) ─────────────

export async function wakeRApi(): Promise<boolean> {
  if (!IS_PRODUCTION) return true
  try {
    const res = await fetch(`${R_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(30_000), // 30s for cold start
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Execute via Render.com API ────────────────────────────────────────────────

async function executeViaAPI(
  rScript: string,
  excelFilePath: string
): Promise<RExecutionResult> {
  const startTime = Date.now()

  // Read the Excel file and encode as base64 to send with the request
  let excelData = ''
  let fileName = ''
  try {
    if (excelFilePath && fs.existsSync(excelFilePath)) {
      const buffer = fs.readFileSync(excelFilePath)
      excelData = buffer.toString('base64')
      fileName = excelFilePath.split(/[\\/]/).pop() || 'upload.xlsx'
    }
  } catch {
    // File might not be accessible — proceed without it
  }

  try {
    const response = await fetch(`${R_API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: rScript, excelData, fileName }),
      signal: AbortSignal.timeout(150_000), // 2.5 min timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        rawOutput: '',
        errorMessage: `R API returned HTTP ${response.status}: ${errorText}`,
        executionTimeMs: Date.now() - startTime,
        rScript,
      }
    }

    const data = await response.json()
    return {
      success: data.success ?? false,
      rawOutput: data.raw_output ?? '',
      errorMessage: data.error_message ?? null,
      executionTimeMs: data.execution_time_ms ?? (Date.now() - startTime),
      rScript,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Network error calling R API'
    return {
      success: false,
      rawOutput: '',
      errorMessage: msg,
      executionTimeMs: Date.now() - startTime,
      rScript,
    }
  }
}

// ─── Execute via Local Rscript ─────────────────────────────────────────────────

async function executeLocally(rScript: string): Promise<RExecutionResult> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const os = await import('os')
  const path = await import('path')
  const execAsync = promisify(exec)

  const rscript = findRscript()
  const tempDir = process.env.R_TEMP_DIR
    ? process.env.R_TEMP_DIR
    : path.join(os.tmpdir(), 'r-research-assistant')

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const scriptPath = path.join(tempDir, `analysis_${Date.now()}.R`)
  fs.writeFileSync(scriptPath, rScript, 'utf8')

  const startTime = Date.now()
  try {
    const { stdout, stderr } = await execAsync(
      `"${rscript}" --vanilla "${scriptPath}"`,
      {
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, R_BROWSER: 'false', R_PDFVIEWER: 'false' },
      }
    )
    const rawOutput = [stdout, stderr ? `\n--- R Messages ---\n${stderr}` : '']
      .filter(Boolean).join('').trim()
    return {
      success: true,
      rawOutput: rawOutput || '(R returned no output)',
      errorMessage: null,
      executionTimeMs: Date.now() - startTime,
      rScript,
    }
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean }
    if (err.killed) {
      return {
        success: false,
        rawOutput: err.stdout || '',
        errorMessage: 'R script timed out after 2 minutes.',
        executionTimeMs: Date.now() - startTime,
        rScript,
      }
    }
    return {
      success: false,
      rawOutput: err.stdout || '',
      errorMessage: [err.stderr || '', err.message || ''].filter(Boolean).join('\n'),
      executionTimeMs: Date.now() - startTime,
      rScript,
    }
  } finally {
    try { fs.unlinkSync(scriptPath) } catch { /* ignore */ }
  }
}

function findRscript(): string {
  if (process.env.R_EXECUTABLE_PATH) return process.env.R_EXECUTABLE_PATH
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\R\\R-4.6.1\\bin\\Rscript.exe',
      'C:\\Program Files\\R\\R-4.4.0\\bin\\Rscript.exe',
      'C:\\Program Files\\R\\R-4.3.3\\bin\\Rscript.exe',
    ]
    for (const c of candidates) { if (fs.existsSync(c)) return c }
    return 'Rscript'
  }
  const unixCandidates = [
    '/opt/homebrew/bin/Rscript',
    '/usr/local/bin/Rscript',
    '/usr/bin/Rscript',
  ]
  for (const c of unixCandidates) { if (fs.existsSync(c)) return c }
  return 'Rscript'
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export async function executeRScript(
  rScript: string,
  excelFilePath = ''
): Promise<RExecutionResult> {
  if (IS_PRODUCTION) {
    return executeViaAPI(rScript, excelFilePath)
  }
  return executeLocally(rScript)
}

export async function verifyRInstallation(): Promise<{
  available: boolean
  version?: string
  error?: string
  mode: 'api' | 'local'
}> {
  if (IS_PRODUCTION) {
    const alive = await wakeRApi()
    return {
      available: alive,
      version: alive ? 'R via Render.com API' : undefined,
      error: alive ? undefined : `Cannot reach R API at ${R_API_URL}`,
      mode: 'api',
    }
  }

  const rscript = findRscript()
  try {
    const { execSync } = await import('child_process') as typeof import('child_process')
    const version = execSync(`"${rscript}" --version`, { timeout: 10_000 }).toString().split('\n')[0]
    return { available: true, version, mode: 'local' }
  } catch {
    return {
      available: false,
      error: `Rscript not found. Set R_EXECUTABLE_PATH in .env.local`,
      mode: 'local',
    }
  }
}
