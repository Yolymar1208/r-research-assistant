import { supabaseAdmin } from '@/app/lib/supabase-server'

const BUCKET = 'datasets'

// Upload Excel file to Supabase Storage
export async function uploadDatasetToStorage(
  buffer: Buffer,
  fileName: string,
  userId: string | null,
  sessionId: string
): Promise<{ storagePath: string | null; error: string | null }> {
  try {
    const ext = fileName.split('.').pop() || 'xlsx'
    const folder = userId || 'anonymous'
    const storagePath = `${folder}/${sessionId}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })

    if (error) {
      console.error('[Storage] Upload error:', error.message)
      return { storagePath: null, error: error.message }
    }

    return { storagePath, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return { storagePath: null, error: message }
  }
}

// Download Excel file from Supabase Storage to a temp path
export async function downloadDatasetFromStorage(
  storagePath: string,
  tempFilePath: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(storagePath)

    if (error || !data) {
      return { success: false, error: error?.message || 'File not found in storage' }
    }

    const fs = await import('fs')
    const path = await import('path')
    const os = await import('os')

    const dir = path.join(os.tmpdir(), 'r-research-assistant')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const arrayBuffer = await data.arrayBuffer()
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer))

    return { success: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return { success: false, error: message }
  }
}

// Get a signed URL for temporary access
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600) // 1 hour
    if (error || !data) return null
    return data.signedUrl
  } catch { return null }
}
