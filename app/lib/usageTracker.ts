import { supabaseAdmin } from '@/app/lib/supabase-server'

const FREE_LIMIT = 5

// Get current month-year key e.g. "2026-06"
function getMonthYear(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Check if user is allowed to run an analysis
export async function checkUsageLimit(ipAddress: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  plan: string
  remaining: number
}> {
  const monthYear = getMonthYear()

  const { data, error } = await supabaseAdmin
    .from('usage_tracking')
    .select('analyses_count, plan')
    .eq('ip_address', ipAddress)
    .eq('month_year', monthYear)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = row not found (first time user)
    console.error('[Usage] Error checking limit:', error)
    // Fail open — allow the analysis if DB check fails
    return { allowed: true, currentCount: 0, limit: FREE_LIMIT, plan: 'free', remaining: FREE_LIMIT }
  }

  const currentCount = data?.analyses_count ?? 0
  const plan = data?.plan ?? 'free'
  const limit = plan === 'free' ? FREE_LIMIT : Infinity
  const allowed = plan !== 'free' || currentCount < FREE_LIMIT
  const remaining = plan === 'free' ? Math.max(0, FREE_LIMIT - currentCount) : 999

  return { allowed, currentCount, limit: plan === 'free' ? FREE_LIMIT : 999, plan, remaining }
}

// Increment usage count after a successful analysis
export async function incrementUsage(ipAddress: string): Promise<void> {
  const monthYear = getMonthYear()

  const { data: existing } = await supabaseAdmin
    .from('usage_tracking')
    .select('id, analyses_count')
    .eq('ip_address', ipAddress)
    .eq('month_year', monthYear)
    .single()

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
        ip_address: ipAddress,
        month_year: monthYear,
        analyses_count: 1,
        plan: 'free',
      })
  }
}

// Save analysis to history
export async function saveAnalysisHistory(
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

// Get usage status for display on frontend
export async function getUsageStatus(ipAddress: string): Promise<{
  currentCount: number
  limit: number
  plan: string
  remaining: number
  monthYear: string
}> {
  const monthYear = getMonthYear()

  const { data } = await supabaseAdmin
    .from('usage_tracking')
    .select('analyses_count, plan')
    .eq('ip_address', ipAddress)
    .eq('month_year', monthYear)
    .single()

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
