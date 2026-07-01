import type { AnalysisPlan, DatasetSummary, ColumnInfo } from '@/app/types'

export type CheckStatus = 'pass' | 'warn' | 'fail'

export interface AssumptionCheck {
  label: string
  status: CheckStatus
  detail: string
}

export interface AssumptionResult {
  checks: AssumptionCheck[]
  overallStatus: CheckStatus
  canProceed: boolean // always true — checks are advisory, never blocking
  summary: string
}

function findColumn(summary: DatasetSummary, name: string | null | undefined): ColumnInfo | undefined {
  if (!name) return undefined
  return summary.columns.find(c => c.cleanName === name || c.name === name)
}

function sampleSizeCheck(n: number, testType: 'parametric' | 'nonparametric' | 'regression' | 'epi'): AssumptionCheck {
  if (n < 5) return { label: 'Sample size', status: 'fail', detail: `n = ${n} — extremely small. Results will be unreliable. Consider collecting more data.` }
  if (testType === 'parametric' && n < 20) return { label: 'Sample size', status: 'warn', detail: `n = ${n} — below 20. Normality is harder to establish with small samples. Consider a non-parametric alternative.` }
  if (testType === 'regression' && n < 50) return { label: 'Sample size', status: 'warn', detail: `n = ${n} — regression models generally need n ≥ 50 for stable estimates.` }
  if (testType === 'epi' && n < 10) return { label: 'Sample size', status: 'warn', detail: `n = ${n} — very few cases. Rates and ratios will have very wide confidence intervals.` }
  return { label: 'Sample size', status: 'pass', detail: `n = ${n} — sufficient for this test.` }
}

function missingDataCheck(col: ColumnInfo | undefined, role: string): AssumptionCheck | null {
  if (!col) return null
  if (col.missingPercent >= 50) return { label: `Missing data (${role})`, status: 'fail', detail: `"${col.name}" is ${col.missingPercent}% empty. Results will be unreliable.` }
  if (col.missingPercent >= 20) return { label: `Missing data (${role})`, status: 'warn', detail: `"${col.name}" has ${col.missingCount} missing values (${col.missingPercent}%). R will exclude these rows.` }
  if (col.missingCount > 0) return { label: `Missing data (${role})`, status: 'pass', detail: `"${col.name}" has ${col.missingCount} missing values (${col.missingPercent}%) — minor, R will handle these.` }
  return { label: `Missing data (${role})`, status: 'pass', detail: `"${col.name}" has no missing values.` }
}

function numericCheck(col: ColumnInfo | undefined, role: string): AssumptionCheck | null {
  if (!col) return null
  if (col.detectedType === 'character') return { label: `Variable type (${role})`, status: 'fail', detail: `"${col.name}" appears to be text. This test requires a numeric variable. R will attempt to convert it, which may fail.` }
  if (col.detectedType === 'date') return { label: `Variable type (${role})`, status: 'warn', detail: `"${col.name}" is a date column. This test expects numeric data.` }
  return { label: `Variable type (${role})`, status: 'pass', detail: `"${col.name}" is ${col.detectedType} — appropriate for this test.` }
}

function categoricalCheck(col: ColumnInfo | undefined, role: string): AssumptionCheck | null {
  if (!col) return null
  if (col.detectedType === 'numeric' && col.uniqueCount > 10) return { label: `Variable type (${role})`, status: 'warn', detail: `"${col.name}" looks continuous (${col.uniqueCount} unique values). This test expects a categorical variable. Consider recoding into groups.` }
  return { label: `Variable type (${role})`, status: 'pass', detail: `"${col.name}" has ${col.uniqueCount} unique categories — appropriate for this test.` }
}

function groupCountCheck(col: ColumnInfo | undefined, expected: number, testName: string): AssumptionCheck | null {
  if (!col) return null
  if (col.uniqueCount !== expected) return {
    label: 'Group count',
    status: col.uniqueCount > expected ? 'warn' : 'fail',
    detail: `"${col.name}" has ${col.uniqueCount} unique values, but ${testName} requires exactly ${expected} groups. R will attempt to proceed — verify this is correct.`,
  }
  return { label: 'Group count', status: 'pass', detail: `"${col.name}" has exactly ${col.uniqueCount} groups — correct for ${testName}.` }
}

function dateCheck(col: ColumnInfo | undefined): AssumptionCheck | null {
  if (!col) return null
  if (col.detectedType !== 'date') return { label: 'Date column', status: 'warn', detail: `"${col.name}" was not detected as a date column. R will attempt to parse it as a date — check your date format is consistent (YYYY-MM-DD recommended).` }
  return { label: 'Date column', status: 'pass', detail: `"${col.name}" was detected as a date column.` }
}

export function checkAssumptions(plan: AnalysisPlan, summary: DatasetSummary): AssumptionResult {
  const checks: AssumptionCheck[] = []
  const n = summary.rowCount
  const dvCol = findColumn(summary, plan.dependentVariable)
  const ivCol = findColumn(summary, plan.independentVariable)
  const test = plan.selectedTest

  // ─── Per-test checks ───────────────────────────────────────────────────────

  if (test === 'descriptive_statistics') {
    checks.push({ label: 'Sample size', status: n >= 5 ? 'pass' : 'warn', detail: `n = ${n}. Descriptive statistics work with any sample size, but small n limits generalizability.` })
    checks.push({ label: 'Variable types', status: 'pass', detail: `Descriptive statistics work with mixed variable types (numeric and categorical).` })
  }

  else if (test === 'independent_t_test') {
    checks.push(sampleSizeCheck(n, 'parametric'))
    checks.push({ label: 'Normality', status: n >= 30 ? 'pass' : 'warn', detail: n >= 30 ? 'n ≥ 30 — Central Limit Theorem applies, normality is less critical.' : `n = ${n} < 30 — R will run Shapiro-Wilk test. If p < 0.05, consider Mann-Whitney U instead.` })
    const gc = groupCountCheck(ivCol, 2, 'independent t-test')
    if (gc) checks.push(gc)
    const mc = missingDataCheck(dvCol, 'outcome')
    if (mc) checks.push(mc)
    const nc = numericCheck(dvCol, 'outcome')
    if (nc) checks.push(nc)
    checks.push({ label: 'Equal variances', status: 'pass', detail: "Welch's t-test (var.equal=FALSE) is used by default — robust to unequal variances." })
  }

  else if (test === 'paired_t_test') {
    checks.push(sampleSizeCheck(n, 'parametric'))
    checks.push({ label: 'Normality of differences', status: n >= 30 ? 'pass' : 'warn', detail: n >= 30 ? 'n ≥ 30 — normality of differences is less critical.' : `n = ${n} — R will run Shapiro-Wilk on differences. If p < 0.05, consider Wilcoxon Signed-Rank instead.` })
    checks.push({ label: 'Paired observations', status: 'pass', detail: 'Ensure each row represents matched pairs (same subject at 2 time points or matched cases/controls).' })
    const mc = missingDataCheck(dvCol, 'outcome')
    if (mc) checks.push(mc)
  }

  else if (test === 'one_way_anova') {
    checks.push(sampleSizeCheck(n, 'parametric'))
    checks.push({ label: 'Normality', status: n >= 30 ? 'pass' : 'warn', detail: n >= 30 ? 'n ≥ 30 — normality assumption is less critical.' : 'Small sample — R will check normality per group. If violated, consider Kruskal-Wallis.' })
    if (ivCol && ivCol.uniqueCount < 3) checks.push({ label: 'Group count', status: 'fail', detail: `"${ivCol.name}" has only ${ivCol.uniqueCount} group(s). ANOVA requires 3 or more groups. Use t-test for 2 groups.` })
    else if (ivCol) checks.push({ label: 'Group count', status: 'pass', detail: `"${ivCol.name}" has ${ivCol.uniqueCount} groups — correct for ANOVA.` })
    checks.push({ label: 'Homogeneity of variance', status: 'pass', detail: "R will run Levene's test. If p < 0.05, variances are unequal — interpret with caution." })
    const mc = missingDataCheck(dvCol, 'outcome')
    if (mc) checks.push(mc)
  }

  else if (test === 'chi_square') {
    checks.push({ label: 'Sample size', status: n >= 40 ? 'pass' : 'warn', detail: n >= 40 ? `n = ${n} ≥ 40 — appropriate for Chi-Square.` : `n = ${n} < 40 — expected cell counts may fall below 5. R will warn if this occurs; Fisher's Exact may be more appropriate.` })
    const cc = categoricalCheck(dvCol, 'outcome')
    if (cc) checks.push(cc)
    const ci = categoricalCheck(ivCol, 'predictor')
    if (ci) checks.push(ci)
    checks.push({ label: 'Expected cell counts', status: 'warn', detail: 'R will compute expected counts. If any cell < 5, Chi-Square is unreliable — the script will automatically switch to Fisher\'s Exact.' })
    const mc = missingDataCheck(dvCol, 'outcome')
    if (mc) checks.push(mc)
  }

  else if (test === 'pearson_correlation') {
    checks.push(sampleSizeCheck(n, 'parametric'))
    checks.push({ label: 'Normality', status: n >= 30 ? 'pass' : 'warn', detail: n >= 30 ? 'n ≥ 30 — normality less critical.' : 'Small n — R will run Shapiro-Wilk. Consider Spearman if non-normal.' })
    const nc = numericCheck(dvCol, 'variable 1')
    if (nc) checks.push(nc)
    const ni = numericCheck(ivCol, 'variable 2')
    if (ni) checks.push(ni)
    checks.push({ label: 'Linearity', status: 'warn', detail: 'Pearson assumes a linear relationship. If the relationship is curved, Spearman correlation is more appropriate.' })
  }

  else if (test === 'mann_whitney') {
    checks.push(sampleSizeCheck(n, 'nonparametric'))
    const gc = groupCountCheck(ivCol, 2, 'Mann-Whitney U')
    if (gc) checks.push(gc)
    const mc = missingDataCheck(dvCol, 'outcome')
    if (mc) checks.push(mc)
    checks.push({ label: 'Ordinal or continuous outcome', status: 'pass', detail: 'Mann-Whitney works with ordinal or continuous outcomes — no normality required.' })
  }

  else if (test === 'wilcoxon_signed_rank') {
    checks.push(sampleSizeCheck(n, 'nonparametric'))
    checks.push({ label: 'Paired observations', status: 'pass', detail: 'Ensure rows represent paired measurements (same subject, 2 time points).' })
    checks.push({ label: 'Symmetric differences', status: 'warn', detail: 'Wilcoxon Signed-Rank assumes differences are roughly symmetric around zero. If heavily skewed, interpret with caution.' })
  }

  else if (test === 'kruskal_wallis') {
    checks.push(sampleSizeCheck(n, 'nonparametric'))
    if (ivCol && ivCol.uniqueCount < 3) checks.push({ label: 'Group count', status: 'fail', detail: `"${ivCol.name}" has only ${ivCol.uniqueCount} group(s). Kruskal-Wallis needs 3 or more groups.` })
    else if (ivCol) checks.push({ label: 'Group count', status: 'pass', detail: `"${ivCol.name}" has ${ivCol.uniqueCount} groups — correct for Kruskal-Wallis.` })
    checks.push({ label: 'Distribution shape', status: 'warn', detail: 'If comparing medians, distributions should have the same shape across groups. If not, results indicate stochastic dominance rather than median differences.' })
  }

  else if (test === 'spearman_correlation') {
    checks.push(sampleSizeCheck(n, 'nonparametric'))
    checks.push({ label: 'Variable types', status: 'pass', detail: 'Spearman works with ordinal or continuous variables — no normality required.' })
    const mc = missingDataCheck(dvCol, 'variable 1')
    if (mc) checks.push(mc)
  }

  else if (test === 'fishers_exact') {
    checks.push({ label: 'Sample size', status: n < 40 ? 'pass' : 'warn', detail: n < 40 ? `n = ${n} — Fisher's Exact is appropriate for small samples.` : `n = ${n} — with this sample size, Chi-Square may be sufficient. Fisher's Exact is still valid.` })
    const cc = categoricalCheck(dvCol, 'outcome')
    if (cc) checks.push(cc)
    const ci = categoricalCheck(ivCol, 'predictor')
    if (ci) checks.push(ci)
  }

  else if (test === 'mcnemar') {
    checks.push(sampleSizeCheck(n, 'nonparametric'))
    checks.push({ label: 'Paired categorical data', status: 'pass', detail: 'McNemar requires the same subjects measured at two time points with a binary outcome each time.' })
    checks.push({ label: 'Discordant pairs', status: 'warn', detail: "McNemar's test is based on discordant pairs (b + c). If b + c < 25, use exact McNemar — R handles this automatically." })
  }

  else if (test === 'logistic_regression') {
    checks.push(sampleSizeCheck(n, 'regression'))
    const nPredictors = 1 + (plan.additionalVariables?.length || 0)
    const eventsPerVar = Math.floor(n / (nPredictors * 10))
    checks.push({ label: 'Events per variable', status: eventsPerVar >= 1 ? 'pass' : 'warn', detail: eventsPerVar >= 1 ? `Estimated ≥10 events per predictor — sufficient.` : `With n = ${n} and ${nPredictors} predictor(s), the events-per-variable ratio may be low. Estimates could be unstable.` })
    if (dvCol && dvCol.uniqueCount !== 2) checks.push({ label: 'Binary outcome', status: 'fail', detail: `"${dvCol.name}" has ${dvCol.uniqueCount} unique values. Logistic regression requires a binary outcome (exactly 2 categories).` })
    else checks.push({ label: 'Binary outcome', status: 'pass', detail: `"${dvCol?.name}" has 2 categories — correct for logistic regression.` })
    checks.push({ label: 'Multicollinearity', status: 'warn', detail: 'If predictors are highly correlated, VIF values will be high. R will compute VIF — values > 10 indicate a problem.' })
  }

  else if (test === 'linear_regression') {
    checks.push(sampleSizeCheck(n, 'regression'))
    const nc = numericCheck(dvCol, 'outcome')
    if (nc) checks.push(nc)
    const mc = missingDataCheck(dvCol, 'outcome')
    if (mc) checks.push(mc)
    checks.push({ label: 'Linearity', status: 'warn', detail: 'Linear regression assumes a linear relationship between predictors and outcome.' })
    checks.push({ label: 'Normality of residuals', status: 'warn', detail: 'Residuals should be approximately normally distributed. R will compute R-squared — check residual plots if available.' })
    checks.push({ label: 'Multicollinearity', status: 'warn', detail: 'R will compute VIF for multiple predictors. VIF > 10 indicates problematic collinearity.' })
  }

  else if (test === 'epidemic_curve') {
    checks.push(sampleSizeCheck(n, 'epi'))
    const dc = dateCheck(dvCol)
    if (dc) checks.push(dc)
    checks.push({ label: 'Date completeness', status: dvCol && dvCol.missingCount === 0 ? 'pass' : 'warn', detail: dvCol && dvCol.missingCount > 0 ? `"${dvCol.name}" has ${dvCol.missingCount} missing dates. Cases without onset dates will be excluded from the curve.` : 'No missing onset dates — all cases will appear in the curve.' })
    checks.push({ label: 'Date format', status: 'warn', detail: 'Ensure dates are in a consistent format (YYYY-MM-DD preferred). Mixed formats will cause parsing errors.' })
  }

  else if (test === 'attack_rate_table') {
    checks.push(sampleSizeCheck(n, 'epi'))
    if (ivCol && ivCol.uniqueCount !== 2) checks.push({ label: 'Exposure variable', status: 'warn', detail: `"${ivCol?.name}" has ${ivCol?.uniqueCount} unique values. Attack rate tables work best with a binary exposure (Exposed/Unexposed).` })
    else checks.push({ label: 'Exposure variable', status: 'pass', detail: `"${ivCol?.name}" is binary — correct for attack rate analysis.` })
    if (dvCol && dvCol.uniqueCount !== 2) checks.push({ label: 'Outcome variable', status: 'warn', detail: `"${dvCol?.name}" has ${dvCol?.uniqueCount} unique values. Attack rate tables require a binary outcome (Case/Control or Ill/Not ill).` })
    else checks.push({ label: 'Outcome variable', status: 'pass', detail: `"${dvCol?.name}" is binary — correct for attack rate analysis.` })
    checks.push({ label: 'Case definition', status: 'warn', detail: 'Ensure your case definition is clear and consistently applied across all records before running this analysis.' })
  }

  else if (test === 'age_sex_pyramid') {
    checks.push(sampleSizeCheck(n, 'epi'))
    if (dvCol) {
      const isNumericAge = dvCol.detectedType === 'integer' || dvCol.detectedType === 'numeric'
      checks.push({ label: 'Age variable', status: isNumericAge ? 'pass' : 'warn', detail: isNumericAge ? `"${dvCol.name}" is numeric — R will auto-bin into standard age groups (0-4, 5-9... 75+).` : `"${dvCol.name}" appears to be text. If already in age groups, R will use them as-is. If raw ages, convert to numeric first.` })
    }
    if (ivCol && ivCol.uniqueCount > 3) checks.push({ label: 'Sex variable', status: 'warn', detail: `"${ivCol.name}" has ${ivCol.uniqueCount} unique values. Sex/gender variable should have exactly 2 categories (Male/Female). R will attempt to proceed.` })
    else if (ivCol) checks.push({ label: 'Sex variable', status: 'pass', detail: `"${ivCol.name}" has ${ivCol.uniqueCount} categories — appropriate.` })
  }

  else if (test === 'survival_analysis') {
    checks.push(sampleSizeCheck(n, 'epi'))
    const dc = dateCheck(ivCol)
    if (dc) checks.push({ ...dc, label: 'Date of onset column' })
    const dc2 = dateCheck(dvCol)
    if (dc2) checks.push({ ...dc2, label: 'Date of outcome column' })
    checks.push({ label: 'Outcome variable', status: 'warn', detail: 'Survival analysis needs a column indicating the event (death/recovery). If an "outcome" column exists with values like "Died"/"Recovered", R will use it automatically.' })
    checks.push({ label: 'Censoring', status: 'warn', detail: 'Cases still alive at the end of follow-up are censored. Ensure your outcome column distinguishes events from censored cases.' })
  }

  else if (test === 'moving_average') {
    checks.push(sampleSizeCheck(n, 'epi'))
    const dc = dateCheck(dvCol)
    if (dc) checks.push(dc)
    checks.push({ label: 'Time series length', status: n >= 14 ? 'pass' : 'warn', detail: n >= 14 ? `n = ${n} — sufficient for a 7-day moving average.` : `n = ${n} — very short time series. A 7-day moving average needs at least 14 data points to be meaningful.` })
  }

  // ─── Overall status ────────────────────────────────────────────────────────

  const hasFail = checks.some(c => c.status === 'fail')
  const hasWarn = checks.some(c => c.status === 'warn')
  const overallStatus: CheckStatus = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass'

  const failCount = checks.filter(c => c.status === 'fail').length
  const warnCount = checks.filter(c => c.status === 'warn').length

  const summary = hasFail
    ? `${failCount} critical issue${failCount > 1 ? 's' : ''} detected — review before proceeding`
    : hasWarn
    ? `${warnCount} note${warnCount > 1 ? 's' : ''} — R will handle these, but be aware of the caveats`
    : 'All assumptions appear to be met — good to go'

  return { checks, overallStatus, canProceed: true, summary }
}
