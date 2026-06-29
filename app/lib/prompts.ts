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

EPIDEMIOLOGY-SPECIFIC (use for outbreak/surveillance data):
- epidemic_curve             → bar chart of case counts by date of onset — use when data has a date column and research question involves trend over time or outbreak timeline
- attack_rate_table          → 2x2 table with attack rates, risk ratios, odds ratios — use when comparing attack rates between exposed vs unexposed groups
- age_sex_pyramid            → population pyramid by age group and sex — use when data has age and sex columns and question involves demographic distribution
- survival_analysis          → time-to-event analysis (case fatality, time to recovery) — use when data has date of onset and date of outcome/death
- moving_average             → rolling average of case counts over time — use for smoothing surveillance trend data

SELECTION RULES:
- If n < 30 or non-normal → prefer non-parametric
- If outcome is binary (Yes/No, 0/1) → logistic_regression
- If predicting a number from multiple variables → linear_regression
- If 2x2 table with small n → fishers_exact
- If data has date column and question is about outbreak timeline → epidemic_curve
- If question mentions attack rate, exposed vs unexposed → attack_rate_table
- If question mentions age and sex distribution → age_sex_pyramid
- If question involves time to death or recovery → survival_analysis
- If question involves trend smoothing or weekly averages → moving_average

RESPOND WITH EXACTLY THIS JSON (10 keys, no extras):
{
  "researchQuestion": "one sentence restatement",
  "hypothesis": "null hypothesis in one sentence",
  "dependentVariable": "exact R column name or null",
  "independentVariable": "exact R column name or null",
  "additionalVariables": [],
  "selectedTest": "one of the nineteen test keys above",
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

  if (test === 'epidemic_curve' || test === 'moving_average') {
    if (!dvCol || dvCol.detectedType !== 'date') {
      problems.push(`PROBLEM: "${dv}" must be a date column for epidemic curve analysis.
FIX: clean$${dv} <- as.Date(clean$${dv})
  Ensure dates are in YYYY-MM-DD format before analysis.`)
    }
  }

  if (test === 'attack_rate_table' && dvCol && dvCol.uniqueCount > 2) {
    problems.push(`PROBLEM: Attack rate table works best with a binary outcome.
FIX: Recode "${dv}" into binary: data$${dv}_binary <- ifelse(data$${dv} == "Case", "Case", "Control")`)
  }

  if (test === 'age_sex_pyramid') {
    if (ivCol && ivCol.uniqueCount > 3) {
      problems.push(`PROBLEM: Sex column "${iv}" has ${ivCol.uniqueCount} unique values. Expected 2 (Male/Female).
FIX: data$${iv}_binary <- ifelse(grepl("Male|M", data$${iv}, ignore.case=TRUE), "Male", "Female")`)
    }
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

    epidemic_curve: `
Step 1: suppressPackageStartupMessages(library(lubridate)); suppressPackageStartupMessages(library(ggplot2))
Step 2: clean <- data[!is.na(data$${dv}), ]; clean$onset_date <- as.Date(clean$${dv})
Step 3: cat("Date range:", format(min(clean$onset_date)), "to", format(max(clean$onset_date)), "\\n"); cat("Total cases:", nrow(clean), "\\n")
Step 4: date_range <- as.numeric(max(clean$onset_date) - min(clean$onset_date)); interval <- if(date_range <= 14) "day" else if(date_range <= 90) "week" else "month"; cat("Auto-selected interval:", interval, "\\n")
Step 5: if(interval == "day") { clean$period <- clean$onset_date } else if(interval == "week") { clean$period <- floor_date(clean$onset_date, "week") } else { clean$period <- floor_date(clean$onset_date, "month") }
Step 6: case_counts <- clean %>% dplyr::count(period) %>% dplyr::arrange(period); cat("\\n=== CASE COUNTS BY PERIOD ===\\n"); print(as.data.frame(case_counts))
Step 7: cat("\\n=== EPIDEMIC CURVE SUMMARY ===\\n"); cat("Peak period:", format(case_counts$period[which.max(case_counts$n)]), "\\n"); cat("Peak case count:", max(case_counts$n), "\\n"); cat("Mean cases per period:", round(mean(case_counts$n), 1), "\\n")
Step 8: p <- ggplot(case_counts, aes(x=period, y=n)) + geom_col(fill="#2e75b6", color="white") + labs(title="Epidemic Curve", x=paste("Date (by", interval, ")"), y="Number of cases") + theme_minimal() + theme(axis.text.x=element_text(angle=45, hjust=1)); ggsave("/tmp/epicurve.png", p, width=10, height=6, dpi=150); cat("\\nEpicurve saved to /tmp/epicurve.png\\n")`,

    attack_rate_table: `
Step 1: clean <- data[!is.na(data$${iv}) & !is.na(data$${dv}), ]; cat("Exposure: ${iv} | Outcome: ${dv}\\n"); cat("Total:", nrow(clean), "\\n")
Step 2: cat("\\nExposure groups:\\n"); print(table(clean$${iv})); cat("\\nOutcome categories:\\n"); print(table(clean$${dv}))
Step 3: tbl <- table(Exposure=clean$${iv}, Outcome=clean$${dv}); cat("\\n=== 2x2 CONTINGENCY TABLE ===\\n"); print(addmargins(tbl))
Step 4: cat("\\n=== ATTACK RATES ===\\n"); for(grp in rownames(tbl)) { total <- sum(tbl[grp,]); cases <- tbl[grp, ncol(tbl)]; ar <- cases/total*100; cat(sprintf("Group: %-20s | Cases: %3d | Total: %3d | AR: %.1f%%\\n", grp, cases, total, ar)) }
Step 5: cat("\\n=== CHI-SQUARE TEST ===\\n"); print(chisq.test(tbl))
Step 6: if(all(dim(tbl) == c(2,2))) { a<-tbl[1,1]; b<-tbl[1,2]; c<-tbl[2,1]; d<-tbl[2,2]; rr<-(a/(a+b))/(c/(c+d)); or<-(a*d)/(b*c); rr_l<-exp(log(rr)-1.96*sqrt(1/a-1/(a+b)+1/c-1/(c+d))); rr_u<-exp(log(rr)+1.96*sqrt(1/a-1/(a+b)+1/c-1/(c+d))); cat(sprintf("Risk Ratio: %.2f (95%% CI: %.2f-%.2f)\\n",rr,rr_l,rr_u)); cat(sprintf("Odds Ratio: %.2f\\n",or)); cat(sprintf("Attributable Risk: %.1f%%\\n",(a/(a+b)-c/(c+d))*100)) }
Step 7: print(effectsize::cramers_v(tbl))`,

    age_sex_pyramid: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]; cat("Total records:", nrow(clean), "\\n")
Step 2: if(is.numeric(clean$${dv})) { clean$age_group <- cut(clean$${dv}, breaks=c(0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,Inf), labels=c("0-4","5-9","10-14","15-19","20-24","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-64","65-69","70-74","75+"), right=FALSE) } else { clean$age_group <- clean$${dv} }
Step 3: cat("\\n=== AGE GROUP BY SEX ===\\n"); print(table(clean$age_group, clean$${iv}))
Step 4: cat("\\n=== SEX DISTRIBUTION ===\\n"); print(table(clean$${iv}))
Step 5: if(is.numeric(clean$${dv})) { cat("\\nMedian age by sex:\\n"); print(tapply(clean$${dv}, clean$${iv}, median, na.rm=TRUE)); cat("Mean age by sex:\\n"); print(tapply(clean$${dv}, clean$${iv}, mean, na.rm=TRUE)) }
Step 6: cat("\\n=== PROPORTIONS BY AGE GROUP AND SEX ===\\n"); print(round(prop.table(table(clean$age_group, clean$${iv}), 2)*100, 1))`,

    survival_analysis: `
Step 1: clean <- data[!is.na(data$${dv}) & !is.na(data$${iv}), ]; clean$date_onset <- as.Date(clean$${iv}); clean$date_outcome <- as.Date(clean$${dv})
Step 2: clean$days_to_event <- as.numeric(clean$date_outcome - clean$date_onset); clean <- clean[clean$days_to_event >= 0, ]; cat("Valid records:", nrow(clean), "\\n")
Step 3: cat("\\nTime to event (days):\\n"); print(summary(clean$days_to_event))
Step 4: if("outcome" %in% names(clean)) { clean$event <- ifelse(tolower(as.character(clean$outcome)) %in% c("deceased","died","death"), 1, 0) } else { clean$event <- 1 }; cat("\\nEvent distribution:\\n"); print(table(Event=clean$event))
Step 5: if(!requireNamespace("survival",quietly=TRUE)) install.packages("survival"); library(survival); km_fit <- survfit(Surv(days_to_event, event) ~ 1, data=clean); cat("\\n=== KAPLAN-MEIER SUMMARY ===\\n"); print(summary(km_fit, times=c(7,14,21,28)))
Step 6: cfr <- mean(clean$event)*100; cat(sprintf("\\nCase Fatality Rate: %.1f%% (%d deaths / %d cases)\\n", cfr, sum(clean$event), nrow(clean))); cat("Median survival:", summary(km_fit)$table["median"], "days\\n")`,

    moving_average: `
Step 1: suppressPackageStartupMessages(library(lubridate)); clean <- data[!is.na(data$${dv}), ]; clean$date <- as.Date(clean$${dv})
Step 2: daily_counts <- clean %>% dplyr::count(date) %>% dplyr::arrange(date); all_dates <- data.frame(date=seq.Date(min(daily_counts$date), max(daily_counts$date), by="day")); daily_counts <- merge(all_dates, daily_counts, by="date", all.x=TRUE); daily_counts$n[is.na(daily_counts$n)] <- 0
Step 3: cat("Date range:", format(min(daily_counts$date)), "to", format(max(daily_counts$date)), "\\n"); cat("Total cases:", sum(daily_counts$n), "\\n")
Step 4: daily_counts$ma7 <- stats::filter(daily_counts$n, rep(1/7, 7), sides=2); daily_counts$ma14 <- stats::filter(daily_counts$n, rep(1/14, 14), sides=2)
Step 5: cat("\\n=== DAILY COUNTS WITH 7-DAY MOVING AVERAGE ===\\n"); print(daily_counts[!is.na(daily_counts$ma7), ])
Step 6: cat("\\n=== PEAK ANALYSIS ===\\n"); cat("Peak daily cases:", max(daily_counts$n), "on", format(daily_counts$date[which.max(daily_counts$n)]), "\\n"); ma_clean <- daily_counts[!is.na(daily_counts$ma7), ]; cat("Peak 7-day average:", round(max(ma_clean$ma7, na.rm=TRUE), 1), "\\n")
Step 7: weekly <- clean %>% dplyr::mutate(week=floor_date(date, "week")) %>% dplyr::count(week) %>% dplyr::arrange(week); cat("\\n=== WEEKLY TOTALS ===\\n"); print(weekly)
Step 8: recent_half <- tail(ma_clean$ma7, ceiling(nrow(ma_clean)/2)); earlier_half <- head(ma_clean$ma7, floor(nrow(ma_clean)/2)); trend <- if(mean(recent_half, na.rm=TRUE) > mean(earlier_half, na.rm=TRUE)) "INCREASING" else "DECREASING"; cat("\\nOverall trend:", trend, "\\n"); cat("Earlier mean:", round(mean(earlier_half, na.rm=TRUE), 1), "cases/day\\n"); cat("Recent mean:", round(mean(recent_half, na.rm=TRUE), 1), "cases/day\\n")`,
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
5. Only use: readxl, dplyr, janitor, car, effectsize, psych, lubridate, survival, ggplot2

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
  const isEpiTest = ['epidemic_curve','attack_rate_table','age_sex_pyramid','survival_analysis','moving_average'].includes(plan.selectedTest)

  const epiSections = `Write your interpretation using the standard WHO/FETP/DOH outbreak investigation format:

**1. Summary of Findings**
2-3 sentences. State the key finding and whether it supports or contradicts the null hypothesis.

**2. Results — Time**
Describe the temporal distribution. When did the outbreak start, peak, and end? What does the epidemic curve shape suggest (point source, propagated, continuous)? Include exact dates and counts from R output.

**3. Results — Person**
Describe who was affected. Age distribution, sex breakdown, attack rates by group, case fatality rate, survival times — whichever is relevant. Use exact values from R output only.

**4. Results — Place**
Note any geographic information available. If no place data was analyzed, state that place distribution was not assessed and recommend a spot map as next step.

**5. Statistical Results**
Report exact values: test statistic, p-value, confidence intervals, risk ratios, odds ratios, effect sizes — exactly as they appear in R output. Use a table where appropriate.

**6. Discussion**
Interpret findings in public health context. What does this mean for outbreak control? Are findings consistent with known epidemiology? Flag any paradoxical or unexpected findings with ⚠️.

**7. Recommendations**
List 3-5 concrete, actionable public health recommendations. Format as numbered list using FETP categories: (1) immediate control measures, (2) surveillance enhancement, (3) further investigation, (4) prevention.

**8. Limitations**
List 3-5 specific limitations: sample size, potential biases, missing data, confounders, R output warnings.`

  const standardSections = `Write using these five sections:

**1. Summary of Findings**
2-3 sentences. State whether significant or not.

**2. Statistical Results**
Exact values from R: test statistic, df, p-value, CI, effect size. Use a table where appropriate.

**3. Clinical/Practical Interpretation**
What do these results mean in practice for a nurse, doctor, or public health officer?

**4. Assumptions Check**
Were statistical assumptions met? List each assumption and whether it was satisfied based on R output.

**5. Limitations and Next Steps**
Sample size, confounders not controlled, follow-up analyses recommended.`

  return `You are a senior field epidemiologist and biostatistician interpreting R output for a public health report.

STRICT RULES:
- Base interpretation ENTIRELY on the R output below — never fabricate or estimate values
- If a value is not in the R output, say it was not computed — do not invent it
- Use plain language suitable for a DOH, WHO, or ethics board report
- If output shows errors, describe them clearly
- Flag any convergence warnings, small samples, or violated assumptions with ⚠️

RESEARCH QUESTION: ${plan.researchQuestion}
NULL HYPOTHESIS: ${plan.hypothesis}
TEST: ${plan.selectedTest}
DEPENDENT: ${plan.dependentVariable || 'N/A'}
INDEPENDENT: ${plan.independentVariable || 'N/A'}

R OUTPUT:
---
${rawOutput}
---

${isEpiTest ? epiSections : standardSections}

Do not invent any numbers. All values must come directly from the R output above.`
}
