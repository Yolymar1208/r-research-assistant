import type { DatasetSummary, AnalysisPlan, SupportedTest } from '@/app/types'

// ─── Column Profile Builder ────────────────────────────────────────────────────
// Gives AI rich context about every column: type, unique values, missing data

function buildColumnProfiles(summary: DatasetSummary): string {
  return summary.columns.map((col) => {
    const sampleStr = col.sample
      .filter((v) => v !== null)
      .slice(0, 5)
      .map(String)
      .join(' | ')
    return (
      `  Column: "${col.name}" → R name: ${col.cleanName}\n` +
      `    Type: ${col.detectedType} | Unique values: ${col.uniqueCount} | ` +
      `Missing: ${col.missingCount} (${col.missingPercent}%)\n` +
      `    Sample values: ${sampleStr || '(all missing)'}`
    )
  }).join('\n\n')
}

// ─── Analysis Planner Prompt ───────────────────────────────────────────────────

export function buildAnalysisPlannerPrompt(
  summary: DatasetSummary,
  researchQuestion: string,
  hypothesis: string
): string {
  const columnProfiles = buildColumnProfiles(summary)

  return `You are a senior biostatistician. Your job is to read a dataset profile and select the correct statistical test for a research question.

STRICT OUTPUT RULES:
- Output ONLY a single raw JSON object
- NO markdown, NO backticks, NO code fences, NO preamble, NO explanation
- NO R code inside the JSON under any circumstances
- Exactly 10 keys, no more, no less
- All values must be plain text strings or arrays of strings

DATASET PROFILE:
File: ${summary.fileName}
Rows: ${summary.rowCount} | Columns: ${summary.columnCount}

${columnProfiles}

RESEARCH QUESTION:
${researchQuestion}

HYPOTHESIS:
${hypothesis || '(not provided)'}

SUPPORTED TESTS (choose exactly one key):
- descriptive_statistics
- independent_t_test
- paired_t_test
- one_way_anova
- chi_square
- pearson_correlation

RESPOND WITH EXACTLY THIS STRUCTURE:
{
  "researchQuestion": "one sentence restatement of the research question",
  "hypothesis": "null hypothesis stated in one sentence",
  "dependentVariable": "exact R column name (cleanName) or null",
  "independentVariable": "exact R column name (cleanName) or null",
  "additionalVariables": [],
  "selectedTest": "one of the six test keys above",
  "testRationale": "one sentence explaining why this test was chosen",
  "assumptions": ["assumption 1", "assumption 2", "assumption 3"],
  "followUpQuestions": [],
  "planSummary": "two sentences describing what will be done"
}`
}

// ─── Data Problem Detector ─────────────────────────────────────────────────────
// Analyzes the dataset and plan to identify ALL potential data issues
// before R script generation. Returns a structured list of fixes needed.

function detectDataProblems(
  plan: AnalysisPlan,
  summary: DatasetSummary
): string {
  const problems: string[] = []
  const dv = plan.dependentVariable
  const iv = plan.independentVariable
  const test = plan.selectedTest

  const dvCol = summary.columns.find((c) => c.cleanName === dv)
  const ivCol = summary.columns.find((c) => c.cleanName === iv)

  // ── Problem 1: Independent variable has too many categories for t-test ───────
  if (
    (test === 'independent_t_test' || test === 'paired_t_test') &&
    ivCol && ivCol.uniqueCount > 2
  ) {
    const sampleVals = ivCol.sample.filter(Boolean).map(String).join(', ')
    problems.push(
      `PROBLEM: Independent t-test requires exactly 2 groups, but "${iv}" has ${ivCol.uniqueCount} unique values (e.g. ${sampleVals}).
FIX: Before running the t-test, recode "${iv}" into a binary variable called "${iv}_binary":
  - Identify which values belong to Group A and which to Group B based on the research question
  - Use ifelse() or case_when() to create the binary column
  - Example: data$${iv}_binary <- ifelse(data$${iv} == "None", "Group A", "Group B")
  - Use the recoded column for all analysis`
    )
  }

  // ── Problem 2: Dependent variable is not numeric for t-test/ANOVA/correlation
  if (
    ['independent_t_test', 'paired_t_test', 'one_way_anova', 'pearson_correlation'].includes(test) &&
    dvCol && dvCol.detectedType === 'character'
  ) {
    problems.push(
      `PROBLEM: "${dv}" is detected as character/text, but ${test} requires a numeric dependent variable.
FIX: Convert "${dv}" to numeric using as.numeric(data$${dv}).
  - If conversion produces NAs, the column contains non-numeric text and cannot be used for this test
  - Consider using a different variable or a chi-square test instead`
    )
  }

  // ── Problem 3: Dependent variable is not categorical for chi-square ──────────
  if (
    test === 'chi_square' &&
    dvCol && dvCol.detectedType === 'numeric' && dvCol.uniqueCount > 10
  ) {
    problems.push(
      `PROBLEM: "${dv}" appears to be continuous numeric (${dvCol.uniqueCount} unique values), but chi-square requires categorical variables.
FIX: Either:
  a) Choose a different categorical column as dependent variable, OR
  b) Bin "${dv}" into categories: data$${dv}_cat <- cut(data$${dv}, breaks=c(...), labels=c(...))
  - For clinical data, use clinically meaningful cutpoints`
    )
  }

  // ── Problem 4: Both variables numeric for chi-square ────────────────────────
  if (
    test === 'chi_square' &&
    dvCol && ivCol &&
    dvCol.detectedType !== 'character' && dvCol.uniqueCount > 5 &&
    ivCol.detectedType !== 'character' && ivCol.uniqueCount > 5
  ) {
    problems.push(
      `PROBLEM: Both "${dv}" and "${iv}" appear numeric with many unique values. Chi-square works on categories, not continuous numbers.
FIX: Convert both to factors or consider using pearson_correlation instead.
  - If the variables are truly categorical, ensure they are read as factors: as.factor()`
    )
  }

  // ── Problem 5: Missing values ────────────────────────────────────────────────
  if (dvCol && dvCol.missingCount > 0) {
    problems.push(
      `PROBLEM: Dependent variable "${dv}" has ${dvCol.missingCount} missing values (${dvCol.missingPercent}%).
FIX: Remove rows with missing values before analysis:
  data <- data[!is.na(data$${dv}), ]
  - Report the number of cases excluded due to missing data`
    )
  }

  if (ivCol && ivCol.missingCount > 0) {
    problems.push(
      `PROBLEM: Independent variable "${iv}" has ${ivCol.missingCount} missing values (${ivCol.missingPercent}%).
FIX: Remove rows with missing values before analysis:
  data <- data[!is.na(data$${iv}), ]`
    )
  }

  // ── Problem 6: ANOVA with only 2 groups (use t-test instead) ────────────────
  if (test === 'one_way_anova' && ivCol && ivCol.uniqueCount === 2) {
    problems.push(
      `PROBLEM: One-way ANOVA was selected but "${iv}" has only 2 groups. ANOVA with 2 groups is equivalent to a t-test.
FIX: Proceed with ANOVA (valid), but note in output that an independent t-test would give identical results.`
    )
  }

  // ── Problem 7: ANOVA with too many groups and small sample ──────────────────
  if (
    test === 'one_way_anova' &&
    ivCol && ivCol.uniqueCount > 6 &&
    summary.rowCount < 100
  ) {
    problems.push(
      `PROBLEM: One-way ANOVA with ${ivCol.uniqueCount} groups but only ${summary.rowCount} total rows may yield unreliable results (too few observations per group).
FIX: Check group sizes with table(data$${iv}). If any group has fewer than 5 observations, consider merging categories or using a non-parametric Kruskal-Wallis test as an alternative.`
    )
  }

  // ── Problem 8: Paired t-test needs a pairing structure ──────────────────────
  if (test === 'paired_t_test') {
    problems.push(
      `PROBLEM: Paired t-test requires two measurements from the same subject (e.g., before/after).
FIX: Verify the dataset structure:
  - If data is WIDE format (one row per subject, two columns for measurements):
    t.test(data$${dv}, data$${iv}, paired=TRUE)
  - If data is LONG format (two rows per subject with a time indicator):
    Reshape to wide first using tidyr::pivot_wider() before running the test
  - Ensure observations are properly matched by subject ID`
    )
  }

  // ── Problem 9: Correlation with non-numeric variables ────────────────────────
  if (
    test === 'pearson_correlation' &&
    ((dvCol && dvCol.detectedType === 'character') ||
     (ivCol && ivCol.detectedType === 'character'))
  ) {
    problems.push(
      `PROBLEM: Pearson correlation requires both variables to be numeric, but one or both are character type.
FIX: Either convert to numeric with as.numeric(), or use Spearman correlation for ordinal data:
  cor.test(data$${dv}, data$${iv}, method="spearman")`
    )
  }

  // ── Problem 10: Very small sample size ──────────────────────────────────────
  if (summary.rowCount < 20) {
    problems.push(
      `PROBLEM: Very small sample size (n=${summary.rowCount}). Most parametric tests require at least 20-30 observations for reliable results.
FIX: Proceed with analysis but add a warning in output. Consider non-parametric alternatives:
  - Instead of t-test: Wilcoxon rank-sum test (wilcox.test())
  - Instead of ANOVA: Kruskal-Wallis test (kruskal.test())
  - Instead of Pearson: Spearman correlation (cor.test(..., method="spearman"))
  - Instead of Chi-square: Fisher's exact test (fisher.test())`
    )
  }

  // ── Problem 11: Chi-square with sparse cells ─────────────────────────────────
  if (test === 'chi_square' && dvCol && ivCol) {
    const totalCells = dvCol.uniqueCount * ivCol.uniqueCount
    if (totalCells > summary.rowCount / 5) {
      problems.push(
        `PROBLEM: Contingency table may have sparse cells (${dvCol.uniqueCount} x ${ivCol.uniqueCount} = ${totalCells} cells for ${summary.rowCount} observations). Chi-square requires expected frequency ≥ 5 in at least 80% of cells.
FIX: R will automatically check expected frequencies. If violated:
  - Run fisher.test() instead (exact test, no minimum cell size requirement)
  - Or collapse sparse categories using fct_lump() from the forcats package`
      )
    }
  }

  // ── Problem 12: Column name not found ────────────────────────────────────────
  const allCleanNames = summary.columns.map((c) => c.cleanName)
  if (dv && !allCleanNames.includes(dv)) {
    problems.push(
      `PROBLEM: Dependent variable "${dv}" was not found in the dataset columns after clean_names().
FIX: Use the closest matching column name from this list: ${allCleanNames.join(', ')}
  - Check for typos or extra spaces in the original column header`
    )
  }
  if (iv && !allCleanNames.includes(iv)) {
    problems.push(
      `PROBLEM: Independent variable "${iv}" was not found in the dataset columns after clean_names().
FIX: Use the closest matching column name from this list: ${allCleanNames.join(', ')}`
    )
  }

  // ── Problem 13: Ordinal data treated as nominal ───────────────────────────────
  const ordinalKeywords = ['mild', 'moderate', 'severe', 'low', 'medium', 'high',
    'never', 'sometimes', 'always', 'poor', 'fair', 'good', 'excellent',
    'stage', 'grade', 'class', 'level', 'degree']
  if (
    dvCol && dvCol.detectedType === 'character' &&
    dvCol.sample.some((v) => v && ordinalKeywords.some((kw) => String(v).toLowerCase().includes(kw)))
  ) {
    problems.push(
      `PROBLEM: "${dv}" appears to contain ordinal categories (e.g., Mild/Moderate/Severe). Chi-square ignores the natural ordering of these categories.
FIX: Convert to an ordered factor to preserve the ordinal structure:
  data$${dv} <- factor(data$${dv}, levels=c("Mild","Moderate","Severe"), ordered=TRUE)
  - For ordinal outcomes, consider also reporting Kendall's tau or Spearman correlation`
    )
  }

  // ── Problem 14: Date columns used as grouping variables ──────────────────────
  if (ivCol && ivCol.detectedType === 'date') {
    problems.push(
      `PROBLEM: "${iv}" is a date column, which cannot be directly used as a grouping variable.
FIX: Extract a meaningful time unit before analysis:
  - Week: data$week <- lubridate::week(as.Date(data$${iv}))
  - Month: data$month <- lubridate::month(as.Date(data$${iv}), label=TRUE)
  - Use the new column as the grouping variable instead`
    )
  }

  // ── Problem 15: Factor with "Pending" or unknown values ──────────────────────
  const pendingKeywords = ['pending', 'unknown', 'n/a', 'tbd', 'not done', 'awaiting']
  if (
    (dvCol || ivCol) &&
    [dvCol, ivCol].some((col) =>
      col && col.sample.some((v) =>
        v && pendingKeywords.some((kw) => String(v).toLowerCase().includes(kw))
      )
    )
  ) {
    problems.push(
      `PROBLEM: One or more key variables contain "Pending", "Unknown", or similar non-result values that should not be included in the analysis.
FIX: Filter these out before analysis:
  data <- data[!tolower(data$${dv}) %in% c("pending","unknown","n/a","tbd"), ]
  data <- data[!tolower(data$${iv}) %in% c("pending","unknown","n/a","tbd"), ]
  - Report how many cases were excluded`
    )
  }

  if (problems.length === 0) {
    return 'NO DATA PROBLEMS DETECTED — proceed directly with the analysis.'
  }

  return `DATA PROBLEMS DETECTED (${problems.length} issue${problems.length > 1 ? 's' : ''} — apply ALL fixes before running the test):\n\n` +
    problems.map((p, i) => `[Issue ${i + 1}]\n${p}`).join('\n\n')
}

// ─── Test-Specific R Code Instructions ────────────────────────────────────────

function getTestInstructions(test: SupportedTest, plan: AnalysisPlan): string {
  const dv = plan.dependentVariable || 'dependent_var'
  const iv = plan.independentVariable || 'independent_var'

  const instructions: Record<SupportedTest, string> = {

    descriptive_statistics: `
DESCRIPTIVE STATISTICS — full variable summary:
- Use psych::describe() for all numeric variables — prints n, mean, sd, median, min, max, skew, kurtosis
- Use table() for all character/factor variables with addmargins()
- Count missing values: colSums(is.na(data))
- Print column names and types: str(data)`,

    independent_t_test: `
INDEPENDENT SAMPLES T-TEST — step by step:
Step 1 — Ensure exactly 2 groups:
  groups <- unique(na.omit(data$${iv}))
  cat("Groups found:", paste(groups, collapse=" vs "), "\\n")
  if (length(groups) != 2) stop("Need exactly 2 groups for t-test")

Step 2 — Remove missing values:
  clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
  cat("Cases after removing missing:", nrow(clean), "\\n")

Step 3 — Print group sizes and means:
  print(table(clean$${iv}))
  print(tapply(clean$${dv}, clean$${iv}, mean, na.rm=TRUE))

Step 4 — Normality test per group:
  for (g in groups) {
    subset_vals <- clean$${dv}[clean$${iv} == g]
    if (length(subset_vals) >= 3 && length(subset_vals) <= 5000) {
      cat("Shapiro-Wilk for group", g, ":\\n")
      print(shapiro.test(subset_vals))
    }
  }

Step 5 — Levene's test for equal variance:
  clean$${iv} <- as.factor(clean$${iv})
  print(car::leveneTest(clean$${dv} ~ clean$${iv}))

Step 6 — Run t-test (use var.equal=FALSE by default — Welch's t-test):
  result <- t.test(clean$${dv} ~ clean$${iv}, var.equal=FALSE)
  print(result)

Step 7 — Effect size:
  print(effectsize::cohens_d(clean$${dv} ~ clean$${iv}))`,

    paired_t_test: `
PAIRED T-TEST — step by step:
Step 1 — Identify the two measurement columns (wide format assumed):
  cat("Using: ${dv} paired with ${iv}\\n")
  clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
  cat("Valid pairs:", nrow(clean), "\\n")

Step 2 — Compute differences and check normality:
  differences <- clean$${dv} - as.numeric(clean$${iv})
  cat("Mean difference:", mean(differences), "\\n")
  if (length(differences) >= 3) print(shapiro.test(differences))

Step 3 — Run paired t-test:
  result <- t.test(clean$${dv}, as.numeric(clean$${iv}), paired=TRUE)
  print(result)

Step 4 — Effect size:
  print(effectsize::cohens_d(clean$${dv}, as.numeric(clean$${iv}), paired=TRUE))`,

    one_way_anova: `
ONE-WAY ANOVA — step by step:
Step 1 — Check groups and remove missing:
  clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
  clean$${iv} <- as.factor(clean$${iv})
  cat("Group sizes:\\n"); print(table(clean$${iv}))
  cat("Group means:\\n"); print(tapply(clean$${dv}, clean$${iv}, mean, na.rm=TRUE))

Step 2 — Normality per group (Shapiro-Wilk):
  for (g in levels(clean$${iv})) {
    vals <- clean$${dv}[clean$${iv} == g]
    if (length(vals) >= 3 && length(vals) <= 5000) {
      cat("Shapiro-Wilk for", g, ":\\n"); print(shapiro.test(vals))
    }
  }

Step 3 — Homogeneity of variance:
  print(car::leveneTest(clean$${dv} ~ clean$${iv}))

Step 4 — Run ANOVA:
  model <- aov(clean$${dv} ~ clean$${iv})
  print(summary(model))

Step 5 — Post-hoc test (always run — shows which groups differ):
  print(TukeyHSD(model))

Step 6 — Effect size:
  print(effectsize::eta_squared(model))`,

    chi_square: `
CHI-SQUARE TEST — step by step:
Step 1 — Remove missing and pending values:
  clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
  clean <- clean[!tolower(as.character(clean$${dv})) %in% c("pending","unknown","n/a"), ]
  clean <- clean[!tolower(as.character(clean$${iv})) %in% c("pending","unknown","n/a"), ]
  cat("Cases for analysis:", nrow(clean), "\\n")

Step 2 — Build and print contingency table:
  tbl <- table(clean$${iv}, clean$${dv})
  cat("\\nContingency Table:\\n"); print(addmargins(tbl))
  cat("\\nRow proportions:\\n"); print(round(prop.table(tbl, 1) * 100, 1))

Step 3 — Check expected frequencies:
  expected <- chisq.test(tbl)$expected
  cat("\\nExpected frequencies:\\n"); print(round(expected, 2))
  min_expected <- min(expected)
  cat("Minimum expected frequency:", round(min_expected, 2), "\\n")

Step 4 — Run appropriate test:
  if (min_expected >= 5) {
    cat("\\n--- CHI-SQUARE TEST ---\\n")
    print(chisq.test(tbl))
  } else {
    cat("\\nMinimum expected < 5: Running Fisher's Exact Test instead\\n")
    print(fisher.test(tbl, simulate.p.value=TRUE))
  }

Step 5 — Effect size (Cramer's V):
  print(effectsize::cramers_v(tbl))`,

    pearson_correlation: `
PEARSON CORRELATION — step by step:
Step 1 — Ensure numeric and remove missing:
  clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
  clean$${dv} <- as.numeric(clean$${dv})
  clean$${iv} <- as.numeric(clean$${iv})
  cat("Valid pairs:", nrow(clean), "\\n")

Step 2 — Descriptive stats for both variables:
  cat("${dv}: mean =", mean(clean$${dv}, na.rm=TRUE), "sd =", sd(clean$${dv}, na.rm=TRUE), "\\n")
  cat("${iv}: mean =", mean(clean$${iv}, na.rm=TRUE), "sd =", sd(clean$${iv}, na.rm=TRUE), "\\n")

Step 3 — Normality check:
  if (nrow(clean) <= 5000) {
    cat("Shapiro-Wilk for ${dv}:\\n"); print(shapiro.test(clean$${dv}))
    cat("Shapiro-Wilk for ${iv}:\\n"); print(shapiro.test(clean$${iv}))
  }

Step 4 — Pearson correlation:
  result <- cor.test(clean$${dv}, clean$${iv}, method="pearson")
  print(result)
  cat("\\nCorrelation strength:\\n")
  r <- abs(result$estimate)
  if (r < 0.1) cat("Negligible\\n") else if (r < 0.3) cat("Weak\\n") else if (r < 0.5) cat("Moderate\\n") else if (r < 0.7) cat("Strong\\n") else cat("Very strong\\n")

Step 5 — Spearman as backup (if normality violated):
  cat("\\n--- Spearman Correlation (non-parametric backup) ---\\n")
  print(cor.test(clean$${dv}, clean$${iv}, method="spearman"))`,
  }

  return instructions[test] || '- Run the appropriate analysis and print all results clearly'
}

// ─── R Code Generator Prompt ───────────────────────────────────────────────────

export function buildRCodeGeneratorPrompt(
  plan: AnalysisPlan,
  summary: DatasetSummary,
  excelFilePath: string
): string {
  const columnList = summary.columns
    .map((col) => `#   ${col.cleanName}  (${col.detectedType}, ${col.uniqueCount} unique values)`)
    .join('\n')

  const skipRows = (summary as DatasetSummary & { skipRows?: number }).skipRows ?? 0
  const readExcelCall = skipRows > 0
    ? `readxl::read_excel(file_path, skip = ${skipRows})`
    : `readxl::read_excel(file_path)`

  // Run the data problem detector
  const dataProblems = detectDataProblems(plan, summary)

  return `You are an expert R programmer generating a clean, focused statistical analysis script.

ABSOLUTE CODE RULES:
1. Output ONLY pure R code — no markdown, no backticks, no explanations, no comments outside # section headers
2. Do NOT write exploration loops, scanning loops, or skip-detection loops
3. Do NOT try multiple read strategies — read data ONCE with the exact call provided
4. Maximum 80 lines of code total
5. Only use these packages: readxl, dplyr, janitor, car, effectsize, psych

FILE PATH (copy exactly, do not modify):
"${excelFilePath}"

READ DATA ONCE WITH EXACTLY THIS CALL:
data <- ${readExcelCall}
data <- janitor::clean_names(data)

AVAILABLE COLUMNS (use these exact R names):
${columnList}

ANALYSIS REQUESTED:
Test: ${plan.selectedTest}
Dependent variable: ${plan.dependentVariable || 'N/A'}
Independent variable: ${plan.independentVariable || 'N/A'}

${dataProblems}

STEP-BY-STEP INSTRUCTIONS FOR ${plan.selectedTest.toUpperCase()}:
${getTestInstructions(plan.selectedTest, plan)}

REQUIRED SCRIPT SKELETON (fill in the analysis section):
# === PACKAGES ===
suppressPackageStartupMessages({
  library(readxl); library(janitor); library(dplyr); library(car); library(effectsize); library(psych)
})

# === DATA ===
file_path <- "${excelFilePath}"
data <- ${readExcelCall}
data <- janitor::clean_names(data)
cat("Dataset loaded: Rows =", nrow(data), "| Cols =", ncol(data), "\\n")

# === DATA PREPARATION ===
[apply all fixes from DATA PROBLEMS DETECTED section above]

# === ANALYSIS ===
[follow the step-by-step instructions above exactly]

# === RESULTS ===
cat("\\n=== ANALYSIS COMPLETE ===\\n")

Generate the complete script now. Pure R code only.`
}

// ─── Interpretation Prompt ─────────────────────────────────────────────────────

export function buildInterpretationPrompt(
  plan: AnalysisPlan,
  rScript: string,
  rawOutput: string
): string {
  return `You are a senior biostatistician interpreting R output for a clinical researcher.

CARDINAL RULES:
- Base interpretation ENTIRELY on the R output below — never fabricate or estimate values
- Quote exact numbers from the R output
- Explain results in plain language a nurse or doctor can understand
- If R output shows errors or missing results, say so clearly and explain why

RESEARCH QUESTION: ${plan.researchQuestion}
NULL HYPOTHESIS: ${plan.hypothesis}
TEST: ${plan.selectedTest}
DEPENDENT VARIABLE: ${plan.dependentVariable || 'N/A'}
INDEPENDENT VARIABLE: ${plan.independentVariable || 'N/A'}

R OUTPUT (ground truth — interpret only what is here):
---
${rawOutput}
---

Write your interpretation using these five sections:

**1. Summary of Findings**
2-3 sentences in plain language. State whether the result is significant or not.

**2. Statistical Results**
List the exact values from R output: test statistic, degrees of freedom, p-value, confidence interval, effect size. Quote them directly.

**3. Clinical/Practical Interpretation**
What do these results mean for the research question? Is the association or difference meaningful in practice, not just statistically?

**4. Assumptions Check**
Were the statistical assumptions met? Base this only on what R printed (Shapiro-Wilk, Levene's test, expected cell frequencies, etc.).

**5. Limitations and Next Steps**
Sample size considerations, potential confounders, recommended follow-up analyses.

Do not invent any numbers. Only cite values visible in the R output above.`
}
