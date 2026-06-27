import type { DatasetSummary, AnalysisPlan, SupportedTest } from '@/app/types'

function buildColumnProfiles(summary: DatasetSummary): string {
  return summary.columns.map((col) => {
    const sampleStr = col.sample.filter((v) => v !== null).slice(0, 5).map(String).join(' | ')
    return (
      `  Column: "${col.name}" → R name: ${col.cleanName}\n` +
      `    Type: ${col.detectedType} | Unique values: ${col.uniqueCount} | Missing: ${col.missingCount} (${col.missingPercent}%)\n` +
      `    Sample values: ${sampleStr || '(all missing)'}`
    )
  }).join('\n\n')
}

export function buildAnalysisPlannerPrompt(summary: DatasetSummary, researchQuestion: string, hypothesis: string): string {
  const columnProfiles = buildColumnProfiles(summary)
  return `You are a senior biostatistician. Select the correct statistical test for the research question below.

STRICT OUTPUT RULES:
- Output ONLY a single raw JSON object
- NO markdown, NO backticks, NO code fences, NO preamble, NO explanation
- NO R code inside the JSON under any circumstances
- Exactly 10 keys, no more, no less

DATASET PROFILE:
File: ${summary.fileName}
Rows: ${summary.rowCount} | Columns: ${summary.columnCount}

${columnProfiles}

RESEARCH QUESTION:
${researchQuestion}

HYPOTHESIS:
${hypothesis || '(not provided)'}

SUPPORTED TESTS (choose exactly one key):

PARAMETRIC:
- descriptive_statistics     → summarize all variables
- independent_t_test         → compare means, 2 independent groups, normal data
- paired_t_test              → compare means, same subjects before/after
- one_way_anova              → compare means, 3+ independent groups
- chi_square                 → association between 2 categorical variables, n>=40
- pearson_correlation        → linear relationship between 2 continuous normal variables

NON-PARAMETRIC (use when normality violated or n small):
- mann_whitney               → compare 2 independent groups, non-normal or ordinal
- wilcoxon_signed_rank       → compare paired groups, non-normal
- kruskal_wallis             → compare 3+ independent groups, non-normal
- spearman_correlation       → relationship between 2 variables, non-normal or ordinal
- fishers_exact              → association between 2 categorical variables, n<40 or expected<5
- mcnemar                    → paired categorical data, same subjects 2 time points

REGRESSION:
- logistic_regression        → predict binary outcome (Yes/No) from predictors
- linear_regression          → predict continuous outcome from multiple predictors

SELECTION RULES:
- If n < 30 or non-normal → prefer non-parametric
- If outcome is binary (Yes/No, 0/1) → logistic_regression
- If predicting a number from multiple variables → linear_regression
- If 2x2 table with small n → fishers_exact

RESPOND WITH EXACTLY THIS JSON (10 keys, no extras):
{
  "researchQuestion": "one sentence restatement",
  "hypothesis": "null hypothesis in one sentence",
  "dependentVariable": "exact R column name or null",
  "independentVariable": "exact R column name or null",
  "additionalVariables": [],
  "selectedTest": "one of the fourteen test keys above",
  "testRationale": "one sentence",
  "assumptions": ["assumption 1", "assumption 2"],
  "followUpQuestions": [],
  "planSummary": "two sentences maximum"
}`
}

function detectDataProblems(plan: AnalysisPlan, summary: DatasetSummary): string {
  const problems: string[] = []
  const dv = plan.dependentVariable
  const iv = plan.independentVariable
  const test = plan.selectedTest
  const dvCol = summary.columns.find((c) => c.cleanName === dv)
  const ivCol = summary.columns.find((c) => c.cleanName === iv)

  if ((test === 'independent_t_test' || test === 'paired_t_test' || test === 'mann_whitney') && ivCol && ivCol.uniqueCount > 2) {
    const sampleVals = ivCol.sample.filter(Boolean).map(String).join(', ')
    problems.push(`PROBLEM: This test requires exactly 2 groups, but "${iv}" has ${ivCol.uniqueCount} unique values (e.g. ${sampleVals}).
FIX: Recode "${iv}" into a binary variable:
  data$${iv}_binary <- ifelse(data$${iv} == "None", "No Comorbidity", "With Comorbidity")
  Then use ${iv}_binary as the grouping variable.`)
  }

  if (['independent_t_test', 'paired_t_test', 'one_way_anova', 'pearson_correlation', 'linear_regression'].includes(test) && dvCol && dvCol.detectedType === 'character') {
    problems.push(`PROBLEM: "${dv}" is character type but ${test} requires numeric.
FIX: data$${dv} <- as.numeric(data$${dv})`)
  }

  if (test === 'logistic_regression' && dvCol && dvCol.uniqueCount > 2) {
    problems.push(`PROBLEM: Logistic regression requires a binary outcome but "${dv}" has ${dvCol.uniqueCount} unique values.
FIX: Recode to binary: data$${dv}_binary <- ifelse(data$${dv} == "Target Value", 1, 0)`)
  }

  if ((test === 'chi_square' || test === 'fishers_exact' || test === 'mcnemar') && dvCol && dvCol.detectedType === 'numeric' && dvCol.uniqueCount > 10) {
    problems.push(`PROBLEM: "${dv}" is continuous but chi-square/Fisher requires categorical.
FIX: data$${dv}_cat <- cut(data$${dv}, breaks=c(...), labels=c(...))`)
  }

  if (dvCol && dvCol.missingCount > 0) {
    problems.push(`PROBLEM: "${dv}" has ${dvCol.missingCount} missing values.
FIX: data <- data[!is.na(data$${dv}), ]`)
  }

  if (ivCol && ivCol.missingCount > 0) {
    problems.push(`PROBLEM: "${iv}" has ${ivCol.missingCount} missing values.
FIX: data <- data[!is.na(data$${iv}), ]`)
  }

  if (summary.rowCount < 20) {
    problems.push(`PROBLEM: Very small sample (n=${summary.rowCount}). Consider non-parametric alternatives.
FIX: Proceed but add warning. Use wilcox.test() instead of t.test(), fisher.test() instead of chisq.test().`)
  }

  const pendingKeywords = ['pending', 'unknown', 'n/a', 'tbd']
  if ([dvCol, ivCol].some((col) => col && col.sample.some((v) => v && pendingKeywords.some((kw) => String(v).toLowerCase().includes(kw))))) {
    problems.push(`PROBLEM: Key variables contain "Pending" or "Unknown" values.
FIX: data <- data[!tolower(as.character(data$${dv})) %in% c("pending","unknown","n/a"), ]
     data <- data[!tolower(as.character(data$${iv})) %in% c("pending","unknown","n/a"), ]`)
  }

  if (problems.length === 0) return 'NO DATA PROBLEMS DETECTED — proceed directly with the analysis.'
  return `DATA PROBLEMS DETECTED (${problems.length} issue${problems.length > 1 ? 's' : ''} — apply ALL fixes):\n\n` + problems.map((p, i) => `[Issue ${i + 1}]\n${p}`).join('\n\n')
}

function getTestInstructions(test: SupportedTest, plan: AnalysisPlan): string {
  const dv = plan.dependentVariable || 'dependent_var'
  const iv = plan.independentVariable || 'independent_var'
  const extra = plan.additionalVariables.length > 0 ? ', "' + plan.additionalVariables.join('", "') + '"' : ''

  const instructions: Partial<Record<SupportedTest, string>> = {

    descriptive_statistics: `
- Use psych::describe() for all numeric variables
- Use table() with addmargins() for all categorical variables
- Print colSums(is.na(data)) for missing value summary
- Print str(data) for structure overview`,

    independent_t_test: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]; clean$${iv} <- as.factor(clean$${iv})
Step 2: print(table(clean$${iv})); print(tapply(clean$${dv}, clean$${iv}, mean, na.rm=TRUE))
Step 3: for each group run shapiro.test()
Step 4: print(car::leveneTest(clean$${dv} ~ clean$${iv}))
Step 5: result <- t.test(clean$${dv} ~ clean$${iv}, var.equal=FALSE); print(result)
Step 6: print(effectsize::cohens_d(clean$${dv} ~ clean$${iv}))`,

    paired_t_test: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
Step 2: differences <- as.numeric(clean$${dv}) - as.numeric(clean$${iv}); print(shapiro.test(differences))
Step 3: result <- t.test(as.numeric(clean$${dv}), as.numeric(clean$${iv}), paired=TRUE); print(result)
Step 4: print(effectsize::cohens_d(as.numeric(clean$${dv}), as.numeric(clean$${iv}), paired=TRUE))`,

    one_way_anova: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]; clean$${iv} <- as.factor(clean$${iv})
Step 2: print(table(clean$${iv})); print(tapply(clean$${dv}, clean$${iv}, mean, na.rm=TRUE))
Step 3: for each group run shapiro.test()
Step 4: print(car::leveneTest(clean$${dv} ~ clean$${iv}))
Step 5: model <- aov(clean$${dv} ~ clean$${iv}); print(summary(model))
Step 6: print(TukeyHSD(model))
Step 7: print(effectsize::eta_squared(model))`,

    chi_square: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
Step 2: clean <- clean[!tolower(as.character(clean$${dv})) %in% c("pending","unknown","n/a"), ]
Step 3: clean <- clean[!tolower(as.character(clean$${iv})) %in% c("pending","unknown","n/a"), ]
Step 4: tbl <- table(clean$${iv}, clean$${dv}); print(addmargins(tbl)); print(round(prop.table(tbl,1)*100,1))
Step 5: expected <- chisq.test(tbl)$expected; print(round(expected,2)); cat("Min expected:", min(expected), "\\n")
Step 6: if(min(expected) >= 5) { print(chisq.test(tbl)) } else { print(fisher.test(tbl, simulate.p.value=TRUE)) }
Step 7: print(effectsize::cramers_v(tbl))`,

    pearson_correlation: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
Step 2: clean$${dv} <- as.numeric(clean$${dv}); clean$${iv} <- as.numeric(clean$${iv})
Step 3: print(shapiro.test(clean$${dv})); print(shapiro.test(clean$${iv}))
Step 4: result <- cor.test(clean$${dv}, clean$${iv}, method="pearson"); print(result)
Step 5: r <- abs(result$estimate); cat("Strength:", ifelse(r<0.1,"Negligible",ifelse(r<0.3,"Weak",ifelse(r<0.5,"Moderate",ifelse(r<0.7,"Strong","Very strong")))), "\\n")
Step 6: print(cor.test(clean$${dv}, clean$${iv}, method="spearman"))`,

    mann_whitney: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]; clean$${iv} <- as.factor(clean$${iv})
Step 2: cat("Groups:", levels(clean$${iv}), "| n ="); print(table(clean$${iv}))
Step 3: print(tapply(clean$${dv}, clean$${iv}, summary))
Step 4: result <- wilcox.test(clean$${dv} ~ clean$${iv}, exact=FALSE); print(result)
Step 5: print(effectsize::rank_biserial(clean$${dv} ~ clean$${iv}))`,

    wilcoxon_signed_rank: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
Step 2: differences <- as.numeric(clean$${dv}) - as.numeric(clean$${iv})
Step 3: cat("Pairs:", length(differences), "| Median diff:", median(differences), "\\n")
Step 4: result <- wilcox.test(as.numeric(clean$${dv}), as.numeric(clean$${iv}), paired=TRUE, exact=FALSE); print(result)
Step 5: print(effectsize::rank_biserial(as.numeric(clean$${dv}), as.numeric(clean$${iv}), paired=TRUE))`,

    kruskal_wallis: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]; clean$${iv} <- as.factor(clean$${iv})
Step 2: print(table(clean$${iv})); print(tapply(clean$${dv}, clean$${iv}, median, na.rm=TRUE))
Step 3: result <- kruskal.test(clean$${dv} ~ clean$${iv}); print(result)
Step 4: if(result$p.value < 0.05) { if(!requireNamespace("dunn.test",quietly=TRUE)) install.packages("dunn.test"); library(dunn.test); dunn.test(clean$${dv}, clean$${iv}, method="bonferroni") }
Step 5: print(effectsize::rank_epsilon_squared(clean$${dv} ~ clean$${iv}))`,

    spearman_correlation: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
Step 2: cat("Pairs:", nrow(clean), "| Medians:", median(as.numeric(clean$${dv}),na.rm=TRUE), "vs", median(as.numeric(clean$${iv}),na.rm=TRUE), "\\n")
Step 3: result <- cor.test(as.numeric(clean$${dv}), as.numeric(clean$${iv}), method="spearman", exact=FALSE); print(result)
Step 4: r <- abs(result$estimate); cat("Strength:", ifelse(r<0.1,"Negligible",ifelse(r<0.3,"Weak",ifelse(r<0.5,"Moderate",ifelse(r<0.7,"Strong","Very strong")))), "\\n")`,

    fishers_exact: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
Step 2: clean <- clean[!tolower(as.character(clean$${dv})) %in% c("pending","unknown","n/a"), ]
Step 3: tbl <- table(clean$${iv}, clean$${dv}); print(addmargins(tbl)); print(round(prop.table(tbl,1)*100,1))
Step 4: result <- fisher.test(tbl, simulate.p.value=nrow(tbl)*ncol(tbl)>4); print(result)
Step 5: print(effectsize::cramers_v(tbl))`,

    mcnemar: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]
Step 2: tbl <- table(Before=clean$${iv}, After=clean$${dv}); print(tbl)
Step 3: result <- mcnemar.test(tbl); print(result)
Step 4: b <- tbl[1,2]; c <- tbl[2,1]; cat("Odds ratio:", round(b/c,3), "| Discordant pairs: b =", b, "c =", c, "\\n")`,

    logistic_regression: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]; clean$${dv} <- as.factor(clean$${dv})
Step 2: print(table(clean$${dv}))
Step 3: formula_str <- paste("${dv} ~", paste(c("${iv}"${extra}), collapse=" + ")); model <- glm(as.formula(formula_str), data=clean, family=binomial); print(summary(model))
Step 4: cat("\\nOdds Ratios (95% CI):\\n"); print(round(exp(cbind(OR=coef(model), confint.default(model))),3))
Step 5: cat("AIC:", AIC(model), "\\n"); nagelkerke <- 1-exp((model$deviance-model$null.deviance)/nrow(clean)); nagelkerke_max <- 1-exp(-model$null.deviance/nrow(clean)); cat("Nagelkerke R2:", round(nagelkerke/nagelkerke_max,3), "\\n")`,

    linear_regression: `
Step 1: predictors <- c("${iv}"${extra}); clean <- data[complete.cases(data[,c("${dv}",predictors)]),]
Step 2: cat("Complete cases:", nrow(clean), "\\n"); print(summary(clean$${dv}))
Step 3: formula_str <- paste("${dv} ~", paste(predictors, collapse=" + ")); model <- lm(as.formula(formula_str), data=clean); print(summary(model))
Step 4: print(confint(model))
Step 5: cat("R-squared:", round(summary(model)$r.squared,3), "| Adj R-squared:", round(summary(model)$adj.r.squared,3), "\\n")
Step 6: if(length(predictors)>1) { cat("VIF:\\n"); print(car::vif(model)) }`,
  }

  return instructions[test] || '- Run appropriate statistical analysis and print all results clearly'
}

export function buildRCodeGeneratorPrompt(plan: AnalysisPlan, summary: DatasetSummary, excelFilePath: string): string {
  const columnList = summary.columns.map((col) => `#   ${col.cleanName}  (${col.detectedType}, ${col.uniqueCount} unique values)`).join('\n')
  const skipRows = (summary as DatasetSummary & { skipRows?: number }).skipRows ?? 0
  const readExcelCall = skipRows > 0 ? `readxl::read_excel(file_path, skip = ${skipRows})` : `readxl::read_excel(file_path)`
  const dataProblems = detectDataProblems(plan, summary)

  return `You are an expert R programmer generating a focused statistical analysis script.

ABSOLUTE RULES:
1. Output ONLY pure R code — no markdown, no backticks, no explanations
2. Do NOT write exploration or scanning loops
3. Read data ONCE with the exact call provided below
4. Maximum 80 lines total
5. Only use: readxl, dplyr, janitor, car, effectsize, psych

FILE PATH: "${excelFilePath}"

READ DATA WITH EXACTLY:
data <- ${readExcelCall}
data <- janitor::clean_names(data)

COLUMNS AVAILABLE:
${columnList}

TEST: ${plan.selectedTest}
DEPENDENT: ${plan.dependentVariable || 'N/A'}
INDEPENDENT: ${plan.independentVariable || 'N/A'}
ADDITIONAL: ${plan.additionalVariables.join(', ') || 'none'}

${dataProblems}

INSTRUCTIONS:
${getTestInstructions(plan.selectedTest, plan)}

SKELETON:
# === PACKAGES ===
suppressPackageStartupMessages({ library(readxl); library(janitor); library(dplyr); library(car); library(effectsize); library(psych) })
# === DATA ===
file_path <- "${excelFilePath}"
data <- ${readExcelCall}
data <- janitor::clean_names(data)
cat("Loaded:", nrow(data), "rows |", ncol(data), "cols\\n")
# === DATA PREPARATION ===
[apply fixes above]
# === ANALYSIS ===
[follow instructions above]
# === RESULTS ===
cat("\\n=== ANALYSIS COMPLETE ===\\n")

Generate the complete script now. Pure R only.`
}

export function buildInterpretationPrompt(plan: AnalysisPlan, rScript: string, rawOutput: string): string {
  return `You are a senior biostatistician interpreting R output for a clinical researcher.

RULES:
- Base interpretation ENTIRELY on the R output below
- Never fabricate or estimate values
- Use plain language a nurse or doctor can understand
- If output shows errors, say so clearly

RESEARCH QUESTION: ${plan.researchQuestion}
NULL HYPOTHESIS: ${plan.hypothesis}
TEST: ${plan.selectedTest}
DEPENDENT: ${plan.dependentVariable || 'N/A'}
INDEPENDENT: ${plan.independentVariable || 'N/A'}

R OUTPUT:
---
${rawOutput}
---

Write using these five sections:

**1. Summary of Findings**
2-3 sentences. State whether significant or not.

**2. Statistical Results**
Exact values from R: test statistic, df, p-value, CI, effect size.

**3. Clinical/Practical Interpretation**
What do these results mean in practice?

**4. Assumptions Check**
Were assumptions met based on R output?

**5. Limitations and Next Steps**
Sample size, confounders, follow-up analyses.

Do not invent any numbers.`
}
