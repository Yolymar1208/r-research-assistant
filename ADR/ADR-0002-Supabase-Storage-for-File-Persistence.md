# ADR-0002 — Supabase Storage for Excel File Persistence

| Field | Value |
|---|---|
| Title | Supabase Storage for Excel File Persistence |
| Version | 1.0 |
| Status | Accepted |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-06-30 |

## Context
JOANResearchOS runs on Vercel (frontend) and Render.com (R API). These are two separate servers with no shared filesystem. When a user uploads an Excel file:

- Vercel writes it to `/tmp` during the upload request
- By the time the execute-r API route runs (a separate serverless function invocation), the `/tmp` file is gone
- Render.com runs R in a Docker container with its own filesystem, completely separate from Vercel

Early attempts to solve this problem:
1. Base64 encoding the file and storing in React state → crashed Safari on older devices (2014 MacBook Air) due to large string in state
2. Passing base64 in the request body → Vercel 4.5MB request body limit
3. Relying on Vercel `/tmp` persistence → fails because serverless functions don't share `/tmp`

## Decision
Excel files are uploaded to **Supabase Storage** (`datasets` bucket, private) at upload time. A **1-hour signed URL** is generated fresh at execute-r time and injected into the R script as a `download.file()` call. R downloads the file from Supabase Storage directly onto Render's filesystem and executes the analysis.

## Implementation

**Upload flow (`app/api/upload/route.ts`):**
```typescript
const { storagePath } = await uploadDatasetToStorage(buffer, file.name, userId, sessionId)
// storagePath = "{user_id}/{sessionId}.xlsx"
return { success: true, summary: { ...summary, storagePath } }
```

**Execute flow (`app/api/execute-r/route.ts`):**
```typescript
const signedUrl = await getSignedUrl(storagePath) // fresh 1-hour URL
const downloadBlock = `
temp_dataset_path <- "/tmp/joanresearch_${Date.now()}.xlsx"
download.file("${signedUrl}", temp_dataset_path, mode="wb", quiet=TRUE)
file_path <- temp_dataset_path
`
// Remove original file_path line, prepend download block
finalScript = downloadBlock + rScript.replace(/^file_path\s*<-\s*["'][^"']*["']\s*\n?/m, '')
```

**plumber.R behavior:**
- If script contains `download.file()` → skip path rewrite (R handles file download itself)
- If base64 `excelData` provided AND no `download.file()` → write to `/tmp` and rewrite path

## Supabase Storage Configuration
- Bucket: `datasets`
- Visibility: Private
- RLS: Service role full access
- Signed URL expiry: 3600 seconds (1 hour)
- File path: `{user_id}/{sessionId}.{ext}` or `anonymous/{sessionId}.{ext}`

## Consequences
- Files are persisted independently of Vercel's serverless function lifecycle
- Users can retry analyses without re-uploading (within 1 hour of upload)
- No large binary data in React state or request bodies
- Supabase Storage free tier: 1GB (sufficient for Excel research datasets)

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
