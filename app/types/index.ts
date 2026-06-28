// ─── Dataset Types ────────────────────────────────────────────────────────────

export interface ColumnInfo {
  name: string
  cleanName: string
  detectedType: 'numeric' | 'integer' | 'character' | 'logical' | 'date' | 'unknown'
  missingCount: number
  missingPercent: number
  uniqueCount: number
  sample: (string | number | null)[]
}

export interface DatasetSummary {
  fileName: string
  rowCount: number
  columnCount: number
  columns: ColumnInfo[]
  preview: Record<string, unknown>[]
  uploadedAt: string
  tempFilePath: string
}

// ─── Analysis Types ───────────────────────────────────────────────────────────

export type SupportedTest =
  // Parametric
  | 'descriptive_statistics'
  | 'independent_t_test'
  | 'paired_t_test'
  | 'one_way_anova'
  | 'chi_square'
  | 'pearson_correlation'
  // Non-parametric
  | 'mann_whitney'
  | 'wilcoxon_signed_rank'
  | 'kruskal_wallis'
  | 'spearman_correlation'
  | 'fishers_exact'
  | 'mcnemar'
  // Regression
  | 'logistic_regression'
  | 'linear_regression'
  // Epidemiology-specific
  | 'epidemic_curve'
  | 'attack_rate_table'
  | 'age_sex_pyramid'
  | 'survival_analysis'
  | 'moving_average'

export interface AnalysisPlan {
  researchQuestion: string
  hypothesis: string
  dependentVariable: string | null
  independentVariable: string | null
  additionalVariables: string[]
  selectedTest: SupportedTest
  testRationale: string
  assumptions: string[]
  followUpQuestions: string[]
  planSummary: string
}

export interface RExecutionResult {
  success: boolean
  rawOutput: string
  errorMessage: string | null
  executionTimeMs: number
  rScript: string
}

export interface AnalysisResult {
  plan: AnalysisPlan
  rScript: string
  execution: RExecutionResult
  aiInterpretation: string
  completedAt: string
}

// ─── API Request / Response Types ─────────────────────────────────────────────

export interface UploadResponse {
  success: boolean
  summary?: DatasetSummary
  error?: string
}

export interface AnalyzeRequest {
  datasetSummary: DatasetSummary
  researchQuestion: string
  hypothesis?: string
}

export interface AnalyzeResponse {
  success: boolean
  plan?: AnalysisPlan
  rScript?: string
  error?: string
}

export interface ExecuteRRequest {
  rScript: string
  tempFilePath: string
}

export interface ExecuteRResponse {
  success: boolean
  execution?: RExecutionResult
  error?: string
}

export interface InterpretRequest {
  plan: AnalysisPlan
  rScript: string
  rawOutput: string
}

export interface InterpretResponse {
  success: boolean
  interpretation?: string
  error?: string
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type AppStep =
  | 'upload'
  | 'inspect'
  | 'question'
  | 'analyzing'
  | 'executing'
  | 'interpreting'
  | 'complete'
  | 'error'

export interface AppState {
  step: AppStep
  datasetSummary: DatasetSummary | null
  researchQuestion: string
  hypothesis: string
  analysisResult: AnalysisResult | null
  errorMessage: string | null
}
