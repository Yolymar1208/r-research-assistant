import type { RExecutionResult } from '@/app/types'

const R_API_URL = process.env.R_API_URL?.replace(/\/$/, '')
const IS_PRODUCTION = !!R_API_URL

export async function wakeRApi(): Promise<boolean> {
  if (!IS_PRODUCTION) return true
  try {
    const res = await fetch(`${R_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(30_000),
    })
    return res.ok
  } catch {
    return false
  }
}

async function executeViaAPI(rScript: string, excelFilePath: string): Promise<RExecutionResult> {
  const startTime = Date.now()
  const fs = await import('fs')

  let excelData = ''
  let fileName = ''
  try {
    if (excelFilePath && fs.existsSync(excelFilePath)) {
      const buffer = fs.readFileSync(excelFilePath)
      excelData = buffer.toString('base64')
      fileName = excelFilePath.split(/[\\/]/).pop() || 'upload.xlsx'
      console.log('[rExecutor] File found locally, encoding as base64:', fileName, buffer.length, 'bytes')
    } else {
      console.warn('[rExecutor] File not found locally:', excelFilePath)
    }
  } catch (err) {
    console.warn('[rExecutor] Could not read file:', err)
  }

  try {
    const response = await fetch(`${R_API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: rScript, excelData, fileName }),
      signal: AbortSignal.timeout(180_000),
    })

    if (!response.ok) {
      const text = await response.text()
      return {
        success: false,
        rawOutput: '',
        errorMessage: `R API error ${response.status}: ${text}`,
        executionTimeMs: Date.now() - startTime,
        rScript,
      }
    }

    const result = await response.json()
    console.log('[rExecutor] Response keys:', Object.keys(result))
    console.log('[rExecutor] chartBase64 present:', !!result.chartBase64, '| chart_base64 present:', !!result.chart_base64)
    console.log('[rExecutor] chartBase64 length:', result.chartBase64?.length || 0)
    const rawErr = result.error_message || result.errorMessage
    const rawOut = result.raw_output || result.rawOutput || result.output || ''
    return {
      success: result.success === true,
      rawOutput: Array.isArray(rawOut) ? rawOut.join('\n') : String(rawOut || ''),
      errorMessage: rawErr ? String(Array.isArray(rawErr) ? rawErr[0] : rawErr) : null,
      executionTimeMs: result.execution_time_ms || result.executionTimeMs || Date.now() - startTime,
      rScript,
      chartBase64: result.chartBase64 || result.chart_base64 || undefined,
    }
  } catch (err) {
    return {
      success: false,
      rawOutput: '',
      errorMessage: err instanceof Error ? err.message : 'R API request failed',
      executionTimeMs: Date.now() - startTime,
      rScript,
    }
  }
}

function executeLocally(rScript: string, excelFilePath: string): RExecutionResult {
  const startTime = Date.now()
  try {
    const fs = require('fs')
    const { execSync } = require('child_process')
    const tmp = require('os').tmpdir()
    const path = require('path')
    const scriptPath = path.join(tmp, `r_script_${Date.now()}.R`)
    fs.writeFileSync(scriptPath, rScript)
    const output = execSync(`Rscript --vanilla "${scriptPath}"`, {
      timeout: 120_000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    require('fs').unlinkSync(scriptPath)
    return {
      success: true,
      rawOutput: output,
      errorMessage: null,
      executionTimeMs: Date.now() - startTime,
      rScript,
    }
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string }
    return {
      success: false,
      rawOutput: execErr.stdout || '',
      errorMessage: execErr.stderr || execErr.message || 'Local R execution failed',
      executionTimeMs: Date.now() - startTime,
      rScript,
    }
  }
}

export async function executeRScript(rScript: string, excelFilePath: string): Promise<RExecutionResult> {
  if (IS_PRODUCTION) {
    return executeViaAPI(rScript, excelFilePath)
  }
  return executeLocally(rScript, excelFilePath)
}
