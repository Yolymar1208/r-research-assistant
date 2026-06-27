import { supabaseAdmin } from '@/app/lib/supabase-server'

const FREE_LIMIT = 5

function getMonthYear(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Use user_id as primary identifier, fall back to IP for unauthenticated
function getTrackingKey(userId: string | null, ipAddress: string): { user_id: string | null; ip_address: string } {
  return { user_id: userId, ip_address: ipAddress }
}

export async function checkUsageLimit(userId: string | null, ipAddress: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  plan: string
  remaining: number
}> {
  const monthYear = getMonthYear()
  const key = getTrackingKey(userId, ipAddress)

  // Query by user_id if available, otherwise by IP
  let query = supabaseAdmin
    .from('usage_tracking')
    .select('analyses_count, plan')
    .eq('month_year', monthYear)

  if (key.user_id) {
    query = query.eq('user_id', key.user_id)
  } else {
    query = query.eq('ip_address', key.ip_address).is('user_id', null)
  }

  const { data, error } = await query.single()

  if (error && error.code !== 'PGRST116') {
    console.error('[Usage] Error checking limit:', error)
    return { allowed: true, currentCount: 0, limit: FREE_LIMIT, plan: 'free', remaining: FREE_LIMIT }
  }

  const currentCount = data?.analyses_count ?? 0
  const plan = data?.plan ?? 'free'
  const limit = plan === 'free' ? FREE_LIMIT : Infinity
  const allowed = plan !== 'free' || currentCount < FREE_LIMIT
  const remaining = plan === 'free' ? Math.max(0, FREE_LIMIT - currentCount) : 999

  return { allowed, currentCount, limit: plan === 'free' ? FREE_LIMIT : 999, plan, remaining }
}

export async function incrementUsage(userId: string | null, ipAddress: string): Promise<void> {
  const monthYear = getMonthYear()
  const key = getTrackingKey(userId, ipAddress)

  let query = supabaseAdmin
    .from('usage_tracking')
    .select('id, analyses_count')
    .eq('month_year', monthYear)

  if (key.user_id) {
    query = query.eq('user_id', key.user_id)
  } else {
    query = query.eq('ip_address', key.ip_address).is('user_id', null)
  }

  const { data: existing } = await query.single()

  if (existing) {
    await supabaseAdmin
      .from('usage_tracking')
      .update({
        analyses_count: existing.analyses_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('usage_tracking')
      .insert({
        user_id: key.user_id,
        ip_address: key.ip_address,
        month_year: monthYear,
        analyses_count: 1,
        plan: 'free',
      })
  }
}

export async function saveAnalysisHistory(
  userId: string | null,
  ipAddress: string,
  data: {
    datasetName: string
    researchQuestion: string
    selectedTest: string
    aiInterpretation: string
    rScript: string
    rawOutput: string
    executionSuccess: boolean
  }
): Promise<void> {
  await supabaseAdmin.from('analysis_history').insert({
    user_id: userId,
    ip_address: ipAddress,
    dataset_name: data.datasetName,
    research_question: data.researchQuestion,
    selected_test: data.selectedTest,
    ai_interpretation: data.aiInterpretation,
    r_script: data.rScript,
    raw_output: data.rawOutput,
    execution_success: data.executionSuccess,
  })
}

export async function getUsageStatus(userId: string | null, ipAddress: string): Promise<{
  currentCount: number
  limit: number
  plan: string
  remaining: number
  monthYear: string
}> {
  const monthYear = getMonthYear()

  let query = supabaseAdmin
    .from('usage_tracking')
    .select('analyses_count, plan')
    .eq('month_year', monthYear)

  if (userId) {
    query = query.eq('user_id', userId)
  } else {
    query = query.eq('ip_address', ipAddress).is('user_id', null)
  }

  const { data } = await query.single()

  const currentCount = data?.analyses_count ?? 0
  const plan = data?.plan ?? 'free'

  return {
    currentCount,
    limit: plan === 'free' ? FREE_LIMIT : 999,
    plan,
    remaining: plan === 'free' ? Math.max(0, FREE_LIMIT - currentCount) : 999,
    monthYear,
  }
}
