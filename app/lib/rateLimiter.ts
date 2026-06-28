import { supabaseAdmin } from '@/app/lib/supabase-server'

// Rate limit: max 10 requests per minute per user/IP
const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_REQUESTS = 10

export async function checkRateLimit(userId: string | null, ipAddress: string): Promise<{
  allowed: boolean
  remaining: number
  resetIn: number
}> {
  const key = userId || ipAddress
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString()

  try {
    // Count requests in the last minute
    const { count } = await supabaseAdmin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart)

    const currentCount = count ?? 0
    const allowed = currentCount < RATE_LIMIT_MAX_REQUESTS
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - currentCount)

    if (allowed) {
      // Record this request
      await supabaseAdmin.from('rate_limits').insert({ key, created_at: new Date().toISOString() })
    }

    return { allowed, remaining, resetIn: RATE_LIMIT_WINDOW_SECONDS }
  } catch {
    // Fail open if rate limit check fails
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetIn: RATE_LIMIT_WINDOW_SECONDS }
  }
}
