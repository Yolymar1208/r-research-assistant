import { NextRequest, NextResponse } from 'next/server'
import { getUsageStatus } from '@/app/lib/usageTracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP.trim()
  return '127.0.0.1'
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const status = await getUsageStatus(ip)
    return NextResponse.json({ success: true, ...status })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get usage status' }, { status: 500 })
  }
}
