import { supabaseAdmin } from '@/app/lib/supabase-server'

const FREE_LIMIT = 5

function getMonthYear(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Get user plan from users table
async function getUserPlan(userId: string | null): Promise<{ plan: string; limit: number }> {
  if (!userId) return { plan: 'free', limit: FREE_LIMIT }

  const { data } = await supabaseAdmin
    .from('users')
    .select('plan, analyses_limit')
    .eq('id', userId)
    .single()

  if (!data) return { plan: 'free', limit: FREE_LIMIT }

  const limit = data.plan === 'free' ? FREE_LIMIT : (data.analyses_limit ?? 999)
  return { plan: data.plan, limit }
}

export async function checkUsageLimit(userId: string | null, ipAddress: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  plan: string
  remaining: number
}> {
  const monthYear = getMonthYear()
  const { plan, limit } = await getUserPlan(userId)

  // Pro and Institution users have unlimited access
  if (plan !== 'free') {
    return { allowed: true, currentCount: 0, limit: 999, plan, remaining: 999 }
  }

  // Free users — check monthly count
  let query = supabaseAdmin
    .from('usage_tracking')
    .select('analyses_count')
    .eq('month_year', monthYear)

  if (userId) {
    query = query.eq('user_id', userId)
  } else {
    query = query.eq('ip_address', ipAddress).is('user_id', null)
  }

  const { data } = await query.single()
  const currentCount = data?.analyses_count ?? 0
  const allowed = currentCount < FREE_LIMIT
  const remaining = Math.max(0, FREE_LIMIT - currentCount)

  return { allowed, currentCount, limit: FREE_LIMIT, plan: 'free', remaining }
}

export async function incrementUsage(userId: string | null, ipAddress: string): Promise<void> {
  const monthYear = getMonthYear()
  const { plan } = await getUserPlan(userId)

  // Don't track usage for paid plans
  if (plan !== 'free') return

  let query = supabaseAdmin
    .from('usage_tracking')
    .select('id, analyses_count')
    .eq('month_year', monthYear)

  if (userId) {
    query = query.eq('user_id', userId)
  } else {
    query = query.eq('ip_address', ipAddress).is('user_id', null)
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
        user_id: userId,
        ip_address: ipAddress,
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
  const { plan, limit } = await getUserPlan(userId)

  // Paid users — unlimited
  if (plan !== 'free') {
    return { currentCount: 0, limit: 999, plan, remaining: 999, monthYear }
  }

  // Free users — get count
  let query = supabaseAdmin
    .from('usage_tracking')
    .select('analyses_count')
    .eq('month_year', monthYear)

  if (userId) {
    query = query.eq('user_id', userId)
  } else {
    query = query.eq('ip_address', ipAddress).is('user_id', null)
  }

  const { data } = await query.single()
  const currentCount = data?.analyses_count ?? 0

  return {
    currentCount,
    limit: FREE_LIMIT,
    plan: 'free',
    remaining: Math.max(0, FREE_LIMIT - currentCount),
    monthYear,
  }
}
