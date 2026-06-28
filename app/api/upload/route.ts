import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { inspectDataset } from '@/app/lib/datasetInspector'
import { uploadDatasetToStorage } from '@/app/lib/fileStorage'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { UploadResponse } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch { return null }
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 })

    const ext = path.extname(file.name).toLowerCase()
    if (!['.xlsx', '.xls'].includes(ext)) {
      return NextResponse.json({ success: false, error: 'Only Excel files (.xlsx or .xls) are supported.' }, { status: 400 })
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 50MB.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Save to local temp (for immediate R execution)
    const tempDir = path.join(os.tmpdir(), 'r-research-assistant')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
    const sessionId = `upload_${Date.now()}`
    const tempFilePath = path.join(tempDir, `${sessionId}${ext}`)
    fs.writeFileSync(tempFilePath, buffer)

    // Also save to Supabase Storage (for persistence across retries)
    const userId = await getUserId(request)
    const { storagePath } = await uploadDatasetToStorage(buffer, file.name, userId, sessionId)

    // Inspect dataset
    const summary = inspectDataset(buffer, file.name, tempFilePath)

    // Store storage path in summary for later retrieval
    const summaryWithStorage = {
      ...summary,
      storagePath: storagePath || null,
    }

    return NextResponse.json({ success: true, summary: summaryWithStorage })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process file.'
    console.error('[Upload API]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
