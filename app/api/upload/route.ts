import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { inspectDataset } from '@/app/lib/datasetInspector'
import type { UploadResponse } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]
    const allowedExtensions = ['.xlsx', '.xls']
    const ext = path.extname(file.name).toLowerCase()

    if (!allowedExtensions.includes(ext) && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only Excel files (.xlsx or .xls) are supported.' },
        { status: 400 }
      )
    }

    // File size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      )
    }

    // Save to temp directory
    const tempDir = path.join(os.tmpdir(), 'r-research-assistant')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const safeFileName = `upload_${Date.now()}${ext}`
    const tempFilePath = path.join(tempDir, safeFileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(tempFilePath, buffer)

    // Inspect dataset (includes skipRows metadata)
    const summary = inspectDataset(buffer, file.name, tempFilePath)

    return NextResponse.json({ success: true, summary })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process file.'
    console.error('[Upload API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
