import { NextRequest, NextResponse } from 'next/server'
import { sendAnalysisCompleteEmail } from '@/app/lib/emailService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface NotifyRequest {
  toEmail: string
  datasetName: string
  selectedTest: string
  researchQuestion: string
  executionSuccess: boolean
  executionTimeMs: number
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: NotifyRequest = await request.json()
    const { toEmail, datasetName, selectedTest, researchQuestion, executionSuccess, executionTimeMs } = body

    if (!toEmail || !selectedTest || !researchQuestion) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 })
    }

    // Basic email format check — don't attempt sending to obviously invalid addresses
    if (!toEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'Invalid email address.' }, { status: 400 })
    }

    await sendAnalysisCompleteEmail({
      toEmail,
      datasetName,
      selectedTest,
      researchQuestion,
      executionSuccess,
      executionTimeMs,
      appUrl: 'https://r-research-assistant-vx33.vercel.app',
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Email send failed.'
    console.error('[Notify Analysis API]', message)
    // Return 200 even on failure — this is fire-and-forget, we never want
    // an email error to surface to the user as an analysis failure.
    return NextResponse.json({ success: false, error: message })
  }
}
