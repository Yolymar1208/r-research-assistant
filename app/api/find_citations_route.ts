import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisPlan } from '@/app/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLIENT = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface LiveCitation {
  title: string
  authors: string
  year: number | null
  url: string
  source: string
  relevance: string
  type: 'journal' | 'guideline' | 'manual' | 'other'
}

interface FindCitationsRequest {
  plan: AnalysisPlan
  keyFindings: string   // 2-3 sentence summary of key findings from R output
  rawOutputSnippet: string // first 500 chars of R output — gives context
}

// Build a targeted search query from the analysis plan and findings
function buildSearchQuery(plan: AnalysisPlan, keyFindings: string): string {
  const testLabels: Record<string, string> = {
    epidemic_curve: 'epidemic curve outbreak investigation',
    attack_rate_table: 'attack rate risk ratio foodborne outbreak',
    age_sex_pyramid: 'age sex distribution epidemiology cases',
    survival_analysis: 'survival analysis Kaplan-Meier outbreak case fatality',
    moving_average: 'moving average disease surveillance trend',
    independent_t_test: 'independent samples t-test clinical epidemiology',
    paired_t_test: 'paired t-test before after intervention',
    one_way_anova: 'one-way ANOVA group comparison epidemiology',
    chi_square: 'chi-square test association epidemiology public health',
    pearson_correlation: 'Pearson correlation epidemiology public health',
    mann_whitney: 'Mann-Whitney nonparametric comparison epidemiology',
    wilcoxon_signed_rank: 'Wilcoxon signed-rank test epidemiology',
    kruskal_wallis: 'Kruskal-Wallis nonparametric ANOVA epidemiology',
    spearman_correlation: 'Spearman rank correlation epidemiology',
    fishers_exact: "Fisher's exact test small sample epidemiology",
    mcnemar: "McNemar's test paired categorical epidemiology",
    logistic_regression: 'logistic regression odds ratio epidemiology risk factors',
    linear_regression: 'linear regression epidemiology predictors',
    descriptive_statistics: 'descriptive statistics epidemiology outbreak summary',
  }

  const testContext = testLabels[plan.selectedTest] || plan.selectedTest.replace(/_/g, ' ')

  // Extract key terms from the research question
  const questionTerms = plan.researchQuestion
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(' ')
    .filter(w => w.length > 4 && !['what', 'there', 'between', 'among', 'which', 'where', 'using', 'those', 'their', 'about', 'from', 'that', 'with', 'this', 'have', 'were', 'being', 'does'].includes(w))
    .slice(0, 4)
    .join(' ')

  return `${testContext} ${questionTerms} Philippines public health site:who.int OR site:cdc.gov OR site:ncbi.nlm.nih.gov OR site:epirhandbook.com`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: FindCitationsRequest = await request.json()
    const { plan, keyFindings, rawOutputSnippet } = body

    if (!plan || !keyFindings) {
      return NextResponse.json({ success: false, error: 'Missing plan or findings.' }, { status: 400 })
    }

    const searchQuery = buildSearchQuery(plan, keyFindings)

    const prompt = `You are a field epidemiologist helping find supporting literature for a statistical analysis.

ANALYSIS CONTEXT:
- Test: ${plan.selectedTest.replace(/_/g, ' ')}
- Research question: ${plan.researchQuestion}
- Key findings: ${keyFindings}
- R output snippet: ${rawOutputSnippet}

Search for 2-3 highly relevant peer-reviewed papers or WHO/CDC/DOH guidelines that directly support or contextualize these findings. Focus on:
1. Papers that validate or discuss the statistical method used
2. Guidelines that define thresholds referenced in the findings (e.g., WHO attack rate thresholds, CFR benchmarks)
3. Philippine or Southeast Asian epidemiological context if available

After searching, return ONLY a JSON array. No markdown, no backticks, raw JSON only.

Each item must have exactly these fields:
{
  "title": "exact title of the paper or guideline",
  "authors": "Author1, Author2 et al. or Organization name",
  "year": 2024,
  "url": "https://exact-url-from-search-results",
  "source": "Journal name, WHO, CDC, DOH, etc.",
  "relevance": "one sentence explaining why this is relevant to these specific findings",
  "type": "journal" | "guideline" | "manual" | "other"
}

CRITICAL RULES:
- Only include sources that actually appeared in your search results — never invent URLs or citations
- If you cannot find 3 good results, return fewer — 1 or 2 is fine, 0 is acceptable
- URLs must be real and from search results — do not construct or guess URLs
- Prefer open-access sources (WHO, CDC, PubMed, EpiR Handbook, DOH)
- Do not include sources behind strict paywalls with no abstract access`

    // Call Haiku with web search tool enabled
    const response = await CLIENT.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [
        {
          type: 'web_search_20250305' as any,
          name: 'web_search',
        } as any,
      ],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
          ],
        },
      ],
    } as any)

    // Extract text from response — may contain text + tool_use + tool_result blocks
    const fullResponse = (response as any).content
    const textBlocks = fullResponse
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('')
      .trim()

    if (!textBlocks) {
      return NextResponse.json({ success: true, citations: [] })
    }

    const cleaned = textBlocks
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    // Find the JSON array
    const arrStart = cleaned.indexOf('[')
    const arrEnd = cleaned.lastIndexOf(']')
    if (arrStart === -1 || arrEnd === -1) {
      return NextResponse.json({ success: true, citations: [] })
    }

    let citations: LiveCitation[] = []
    try {
      const parsed = JSON.parse(cleaned.slice(arrStart, arrEnd + 1))
      citations = Array.isArray(parsed)
        ? parsed.filter((c: any) =>
            c.title && c.url && typeof c.url === 'string' && c.url.startsWith('http')
          )
        : []
    } catch {
      console.error('[find-citations] JSON parse error:', cleaned.slice(0, 200))
      citations = []
    }

    return NextResponse.json({ success: true, citations, searchQuery })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Citation search failed.'
    console.error('[find-citations]', message)
    // Return success with empty citations — never let this block the UI
    return NextResponse.json({ success: true, citations: [], error: message })
  }
}
