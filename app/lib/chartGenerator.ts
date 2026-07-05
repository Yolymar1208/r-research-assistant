import type { AnalysisPlan } from '@/app/types'

const CHART_PATH = '/tmp/joanresearch_chart.png'

const THEME_BASE = `
  theme_minimal(base_size = 12) +
  theme(
    plot.title    = element_text(face = "bold", size = 13, color = "#1a2a3a"),
    plot.subtitle = element_text(size = 10, color = "#4a6080", margin = margin(b = 10)),
    plot.caption  = element_text(size = 8, color = "#8098b8", hjust = 1),
    axis.title    = element_text(size = 11, color = "#2a3a4a"),
    axis.text     = element_text(size = 10, color = "#4a5568"),
    panel.grid.minor   = element_blank(),
    panel.grid.major.x = element_blank(),
    legend.position = "bottom",
    plot.margin = margin(16, 16, 16, 16)
  )`

// Wraps chart R code with: package loading, dataframe finder, error handling, and ggsave
function chartCode(innerCode: string): string {
  return [
    '',
    '# ── CHART GENERATION (JOANResearchOS) ────────────────────────────────────────',
    'suppressPackageStartupMessages({',
    '  library(ggplot2); library(scales); library(dplyr)',
    '})',
    'tryCatch({',
    '  # Find the main dataframe — AI scripts use clean, data, or df',
    '  df <- NULL',
    '  for (.nm in c("clean", "data", "df", "dat", "dataset", "linelist")) {',
    '    if (exists(.nm) && is.data.frame(get(.nm)) && nrow(get(.nm)) > 0) {',
    '      df <- get(.nm); break',
    '    }',
    '  }',
    '  if (is.null(df)) stop("Could not find dataframe (tried: clean, data, df)")',
    innerCode,
    '  tryCatch({',
    `    ggsave("${CHART_PATH}", p_chart, width = 10, height = 6, dpi = 150, bg = "white")`,
    '    cat("\\n[CHART_GENERATED]\\n")',
    '  }, error = function(e) {',
    '    cat("\\n[CHART_SAVE_ERROR]", conditionMessage(e), "\\n")',
    '  })',
    '}, error = function(e) {',
    '  cat("\\n[CHART_ERROR]", conditionMessage(e), "\\n")',
    '})',
  ].join('\n')
}

export function getChartCode(plan: AnalysisPlan): string {
  const dv = plan.dependentVariable ? JSON.stringify(plan.dependentVariable) : 'NULL'
  const iv = plan.independentVariable ? JSON.stringify(plan.independentVariable) : 'NULL'

  switch (plan.selectedTest) {

    case 'epidemic_curve': return chartCode([
      '  date_col <- ' + dv,
      '  common_date_names <- c("date_onset","onset_date","date_of_onset","symptom_onset",',
      '                         "date_report","date_consult","date","period")',
      '  if (is.null(date_col) || length(date_col) == 0 || !(date_col %in% names(df))) {',
      '    date_col <- common_date_names[common_date_names %in% names(df)][1]',
      '  }',
      '  if (is.null(date_col) || is.na(date_col) || !(date_col %in% names(df))) {',
      '    date_col <- names(df)[sapply(names(df), function(x) {',
      '      v <- as.character(df[[x]][!is.na(df[[x]])])',
      '      length(v) >= 3 && sum(!is.na(suppressWarnings(as.Date(v[1:min(10,length(v))])))) >= 3',
      '    })][1]',
      '  }',
      '  if (is.null(date_col) || is.na(date_col)) stop(paste("No date column found. cols:", paste(names(df)[1:5], collapse=",")))',
      '  df$epi_date_col <- suppressWarnings(as.Date(as.character(df[[date_col]])))',
      '  epi_data <- df %>% filter(!is.na(epi_date_col)) %>%',
      '    count(epi_date_col) %>% rename(date = epi_date_col, cases = n)',
      '  peak_row <- epi_data[which.max(epi_data$cases),]',
      '  p_chart <- ggplot(epi_data, aes(x = date, y = cases)) +',
      '    geom_col(fill = "#7c5cff", color = "#5a3dcc", width = 0.7, alpha = 0.9) +',
      '    geom_text(aes(label = cases), vjust = -0.4, size = 3.5, color = "#1a2a3a", fontface = "bold") +',
      '    geom_vline(xintercept = as.numeric(peak_row$date), linetype = "dashed",',
      '               color = "#e8b85c", linewidth = 0.8, alpha = 0.8) +',
      '    annotate("text", x = peak_row$date, y = peak_row$cases * 0.55,',
      '             label = paste0("Peak: ", peak_row$cases, " cases"),',
      '             size = 3.2, color = "#92400e", hjust = -0.1, fontface = "bold") +',
      '    scale_x_date(date_labels = "%b %d", date_breaks = "1 day") +',
      '    scale_y_continuous(expand = expansion(mult = c(0, 0.18))) +',
      '    labs(',
      '      title = "Epidemic Curve by Date of Symptom Onset",',
      '      subtitle = paste0("Total cases: ", sum(epi_data$cases),',
      '        "  |  Peak: ", format(peak_row$date, "%B %d, %Y"),',
      '        " (", peak_row$cases, " cases)"),',
      '      x = "Date of Symptom Onset", y = "Number of Cases",',
      '      caption = "JOANResearchOS | All values computed by R"',
      '    ) +' + THEME_BASE + ' +',
      '    theme(axis.text.x = element_text(angle = 45, hjust = 1))',
    ].join('\n'))

    case 'moving_average': return chartCode([
      '  date_col <- ' + dv,
      '  if (is.null(date_col) || !(date_col %in% names(df)))',
      '    date_col <- c("date_onset","date","period","date_report")[c("date_onset","date","period","date_report") %in% names(df)][1]',
      '  df$epi_date_col <- suppressWarnings(as.Date(as.character(df[[date_col]])))',
      '  ma_data <- df %>% filter(!is.na(epi_date_col)) %>%',
      '    count(epi_date_col) %>% rename(date = epi_date_col, cases = n) %>% arrange(date) %>%',
      '    mutate(ma7 = as.numeric(filter(cases, rep(1/7,7), sides=2)))',
      '  p_chart <- ggplot(ma_data, aes(x = date)) +',
      '    geom_col(aes(y = cases), fill = "#7c5cff", alpha = 0.4, width = 0.8) +',
      '    geom_line(aes(y = ma7, color = "7-day MA"), linewidth = 1.2, na.rm = TRUE) +',
      '    scale_color_manual(values = c("7-day MA" = "#e8b85c"), name = NULL) +',
      '    scale_x_date(date_labels = "%b %d", date_breaks = "1 week") +',
      '    scale_y_continuous(expand = expansion(mult = c(0, 0.1))) +',
      '    labs(title = "Case Counts with 7-Day Moving Average",',
      '         subtitle = paste0("Total cases: ", sum(ma_data$cases)),',
      '         x = "Date", y = "Number of Cases",',
      '         caption = "JOANResearchOS | All values computed by R") +' + THEME_BASE + ' +',
      '    theme(axis.text.x = element_text(angle = 45, hjust = 1))',
    ].join('\n'))

    case 'age_sex_pyramid': return chartCode([
      '  age_col <- ' + dv + '; sex_col <- ' + iv,
      '  if (is.null(age_col) || !(age_col %in% names(df))) age_col <- c("age")[c("age") %in% names(df)][1]',
      '  if (is.null(sex_col) || !(sex_col %in% names(df))) sex_col <- c("sex","gender")[c("sex","gender") %in% names(df)][1]',
      '  df$epi_age_col <- suppressWarnings(as.numeric(df[[age_col]]))',
      '  df$epi_sex_col <- as.character(df[[sex_col]])',
      '  df$epi_sex_col <- ifelse(tolower(df$epi_sex_col) %in% c("m","male","lalaki"), "Male",',
      '                    ifelse(tolower(df$epi_sex_col) %in% c("f","female","babae"), "Female", df$epi_sex_col))',
      '  df_c <- df %>% filter(!is.na(epi_age_col), epi_sex_col %in% c("Male","Female"))',
      '  df_c$age_group <- cut(df_c$epi_age_col, breaks=c(0,5,10,15,20,25,30,35,40,45,50,55,60,65,75,Inf),',
      '    labels=c("0-4","5-9","10-14","15-19","20-24","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-64","65-74","75+"),',
      '    right=FALSE, include.lowest=TRUE)',
      '  pyr <- df_c %>% count(age_group, epi_sex_col) %>%',
      '    mutate(n = ifelse(epi_sex_col == "Male", -n, n))',
      '  p_chart <- ggplot(pyr, aes(x = age_group, y = n, fill = epi_sex_col)) +',
      '    geom_col(width = 0.85, alpha = 0.9) + coord_flip() +',
      '    scale_y_continuous(labels = function(x) abs(x)) +',
      '    scale_fill_manual(values = c("Male"="#2e75b6","Female"="#e8b85c"), name=NULL) +',
      '    labs(title="Age-Sex Pyramid of Cases", x="Age Group", y="Number of Cases",',
      '         caption="JOANResearchOS | All values computed by R") +' + THEME_BASE,
    ].join('\n'))

    case 'attack_rate_table': return chartCode([
      '  exp_col <- ' + iv + '; out_col <- ' + dv,
      '  ar_data <- df %>% filter(!is.na(.data[[exp_col]]), !is.na(.data[[out_col]])) %>%',
      '    mutate(exposed = as.character(.data[[exp_col]]), outcome = as.character(.data[[out_col]])) %>%',
      '    count(exposed, outcome) %>% group_by(exposed) %>%',
      '    mutate(pct = n / sum(n) * 100) %>% ungroup()',
      '  p_chart <- ggplot(ar_data, aes(x = exposed, y = pct, fill = outcome)) +',
      '    geom_col(position = "dodge", alpha = 0.88, width = 0.65) +',
      '    geom_text(aes(label = paste0(round(pct,1), "%")), position = position_dodge(0.65),',
      '              vjust = -0.4, size = 3.2) +',
      '    scale_y_continuous(labels = percent_format(scale=1), expand = expansion(mult=c(0,0.12))) +',
      '    scale_fill_brewer(palette = "Set1", name = out_col) +',
      '    labs(title = paste("Attack Rate by", exp_col), x = exp_col, y = "Percentage (%)",',
      '         caption = "JOANResearchOS | All values computed by R") +' + THEME_BASE,
    ].join('\n'))

    case 'survival_analysis': return chartCode([
      '  # Find survival time column (numeric days)',
      '  surv_col <- names(df)[sapply(names(df), function(x) {',
      '    v <- suppressWarnings(as.numeric(df[[x]]))',
      '    is.numeric(df[[x]]) || sum(!is.na(v)) > nrow(df)*0.7',
      '  }) & grepl("day|surv|time|los|stay|duration", names(df), ignore.case=TRUE)][1]',
      '  if (is.null(surv_col) || is.na(surv_col)) {',
      '    # Fallback: compute days from date columns',
      '    date_cols <- names(df)[sapply(names(df), function(x)',
      '      inherits(df[[x]], "Date") || (is.character(df[[x]]) &&',
      '      sum(!is.na(suppressWarnings(as.Date(df[[x]][!is.na(df[[x]])][1:5])))) >= 3))]',
      '    if (length(date_cols) >= 2) {',
      '      df$surv_days_computed <- as.numeric(suppressWarnings(as.Date(as.character(df[[date_cols[2]]]))) -',
      '                                           suppressWarnings(as.Date(as.character(df[[date_cols[1]]]))))',
      '      surv_col <- "surv_days_computed"',
      '    }',
      '  }',
      '  outcome_col <- names(df)[sapply(names(df), function(x) {',
      '    v <- tolower(as.character(df[[x]]))',
      '    any(v %in% c("died","dead","death","recovered","discharged","censored","1","0"))})][1]',
      '  if (!is.null(surv_col) && !is.na(surv_col) && !is.null(outcome_col) && !is.na(outcome_col)) {',
      '    df$surv_t <- suppressWarnings(as.numeric(df[[surv_col]]))',
      '    df$surv_e <- ifelse(tolower(as.character(df[[outcome_col]])) %in% c("died","dead","death","1"), 1, 0)',
      '    df_s <- df %>% filter(!is.na(surv_t), surv_t >= 0, !is.na(surv_e))',
      '    if (nrow(df_s) < 5) stop("Not enough valid survival observations")',
      '    if (requireNamespace("survival", quietly=TRUE)) {',
      '      library(survival)',
      '      km <- survfit(Surv(surv_t, surv_e) ~ 1, data=df_s)',
      '      km_df <- data.frame(',
      '        time = c(0, km$time),',
      '        surv = c(1, km$surv),',
      '        upper = c(1, km$upper),',
      '        lower = c(1, km$lower)',
      '      )',
      '      n_events <- sum(df_s$surv_e)',
      '      med_surv <- ifelse(min(km$surv) <= 0.5, km$time[which(km$surv <= 0.5)[1]], NA)',
      '      p_chart <- ggplot(km_df, aes(x=time, y=surv)) +',
      '        geom_ribbon(aes(ymin=lower, ymax=upper), fill="#7c5cff", alpha=0.15) +',
      '        geom_step(color="#7c5cff", linewidth=1.3) +',
      '        geom_hline(yintercept=0.5, linetype="dashed", color="#e8b85c", linewidth=0.8, alpha=0.7) +',
      '        scale_y_continuous(limits=c(0,1.02), labels=scales::percent_format(), expand=c(0,0)) +',
      '        scale_x_continuous(expand=expansion(mult=c(0,0.05))) +',
      '        labs(',
      '          title="Kaplan-Meier Survival Curve",',
      '          subtitle=paste0("n=", nrow(df_s), " | Events: ", n_events,',
      '            if(!is.na(med_surv)) paste0(" | Median survival: ", med_surv, " days") else ""),',
      '          x="Time (days)", y="Survival Probability",',
      '          caption="JOANResearchOS | All values computed by R"',
      '        ) +' + THEME_BASE,
      '    } else stop("survival package not available")',
      '  } else stop("Could not identify survival time or outcome column")',
    ].join('\n'))

    case 'independent_t_test':
    case 'mann_whitney': return chartCode([
      '  dv_col <- ' + dv + '; iv_col <- ' + iv,
      '  df_p <- df %>% filter(!is.na(.data[[dv_col]]), !is.na(.data[[iv_col]])) %>%',
      '    mutate(y_val = suppressWarnings(as.numeric(.data[[dv_col]])), group = as.character(.data[[iv_col]])) %>%',
      '    filter(!is.na(y_val))',
      '  p_chart <- ggplot(df_p, aes(x=group, y=y_val, fill=group)) +',
      '    geom_boxplot(alpha=0.7, outlier.alpha=0.5, width=0.5) +',
      '    geom_jitter(width=0.12, alpha=0.3, size=1.2, color="#333") +',
      '    stat_summary(fun=mean, geom="point", shape=18, size=4, color="#e8b85c", show.legend=FALSE) +',
      '    scale_fill_manual(values=c("#7c5cff","#2e75b6","#4ade80","#e8b85c","#f87171")) +',
      '    labs(title=paste("Distribution of", dv_col, "by", iv_col),',
      '         subtitle="Diamond = mean | Box = IQR", x=iv_col, y=dv_col,',
      '         caption="JOANResearchOS | All values computed by R") +' + THEME_BASE + ' +',
      '    theme(legend.position="none")',
    ].join('\n'))

    case 'one_way_anova':
    case 'kruskal_wallis': return chartCode([
      '  dv_col <- ' + dv + '; iv_col <- ' + iv,
      '  df_p <- df %>% filter(!is.na(.data[[dv_col]]), !is.na(.data[[iv_col]])) %>%',
      '    mutate(y_val = suppressWarnings(as.numeric(.data[[dv_col]])), group = as.character(.data[[iv_col]])) %>%',
      '    filter(!is.na(y_val))',
      '  p_chart <- ggplot(df_p, aes(x=reorder(group,y_val,median), y=y_val, fill=group)) +',
      '    geom_boxplot(alpha=0.75, outlier.alpha=0.4, width=0.55) +',
      '    stat_summary(fun=mean, geom="point", shape=18, size=4, color="#e8b85c", show.legend=FALSE) +',
      '    scale_fill_brewer(palette="Set2") +',
      '    labs(title=paste("Distribution of", dv_col, "by", iv_col),',
      '         subtitle="Ordered by median | Diamond = mean", x=iv_col, y=dv_col,',
      '         caption="JOANResearchOS | All values computed by R") +' + THEME_BASE + ' +',
      '    theme(legend.position="none")',
    ].join('\n'))

    case 'chi_square':
    case 'fishers_exact': return chartCode([
      '  dv_col <- ' + dv + '; iv_col <- ' + iv,
      '  df_p <- df %>% filter(!is.na(.data[[dv_col]]), !is.na(.data[[iv_col]])) %>%',
      '    mutate(x_var=as.character(.data[[iv_col]]), fill_var=as.character(.data[[dv_col]])) %>%',
      '    count(x_var, fill_var) %>% group_by(x_var) %>% mutate(pct=n/sum(n)*100) %>% ungroup()',
      '  p_chart <- ggplot(df_p, aes(x=x_var, y=pct, fill=fill_var)) +',
      '    geom_col(position="dodge", alpha=0.85, width=0.65) +',
      '    geom_text(aes(label=paste0(n,"\\n(",round(pct,1),"%)")),',
      '              position=position_dodge(0.65), vjust=-0.3, size=3, lineheight=0.9) +',
      '    scale_y_continuous(expand=expansion(mult=c(0,0.18)), labels=percent_format(scale=1)) +',
      '    scale_fill_brewer(palette="Set1", name=dv_col) +',
      '    labs(title=paste("Association between", iv_col, "and", dv_col),',
      '         x=iv_col, y="Percentage (%)", caption="JOANResearchOS | All values computed by R") +' + THEME_BASE,
    ].join('\n'))

    case 'pearson_correlation':
    case 'spearman_correlation': return chartCode([
      '  dv_col <- ' + dv + '; iv_col <- ' + iv,
      '  df_p <- df %>% filter(!is.na(.data[[dv_col]]), !is.na(.data[[iv_col]])) %>%',
      '    mutate(x_val=suppressWarnings(as.numeric(.data[[iv_col]])),',
      '           y_val=suppressWarnings(as.numeric(.data[[dv_col]]))) %>% filter(!is.na(x_val),!is.na(y_val))',
      '  r_val <- round(cor(df_p$x_val, df_p$y_val, method="pearson"), 3)',
      '  p_chart <- ggplot(df_p, aes(x=x_val, y=y_val)) +',
      '    geom_point(alpha=0.5, color="#7c5cff", size=2) +',
      '    geom_smooth(method="lm", color="#e8b85c", fill="#e8b85c", alpha=0.15, linewidth=1.2, se=TRUE) +',
      '    labs(title=paste("Correlation:", dv_col, "vs", iv_col), subtitle=paste0("r = ", r_val),',
      '         x=iv_col, y=dv_col, caption="JOANResearchOS | All values computed by R") +' + THEME_BASE,
    ].join('\n'))

    case 'logistic_regression': return chartCode([
      '  dv_col <- ' + dv + '; iv_col <- ' + iv,
      '  df_p <- df %>% filter(!is.na(.data[[dv_col]]), !is.na(.data[[iv_col]])) %>%',
      '    mutate(outcome_n=suppressWarnings(as.numeric(as.factor(.data[[dv_col]]))-1),',
      '           pred_n=suppressWarnings(as.numeric(.data[[iv_col]]))) %>%',
      '    filter(!is.na(outcome_n), !is.na(pred_n))',
      '  model <- glm(outcome_n ~ pred_n, data=df_p, family=binomial)',
      '  ci <- suppressWarnings(confint.default(model))',
      '  coef_df <- data.frame(var=rownames(ci), OR=exp(coef(model)),',
      '                         lower=exp(ci[,1]), upper=exp(ci[,2]))',
      '  coef_df <- coef_df[coef_df$var != "(Intercept)",]',
      '  p_chart <- ggplot(coef_df, aes(x=OR, y=var)) +',
      '    geom_vline(xintercept=1, linetype="dashed", color="#999", linewidth=0.8) +',
      '    geom_errorbarh(aes(xmin=lower, xmax=upper), height=0.2, color="#4a6080", linewidth=0.9) +',
      '    geom_point(size=4, color="#7c5cff") +',
      '    labs(title="Forest Plot — Odds Ratios", subtitle="Points = OR | Bars = 95% CI",',
      '         x="Odds Ratio (95% CI)", y=NULL, caption="JOANResearchOS | All values computed by R") +' + THEME_BASE,
    ].join('\n'))

    case 'linear_regression': return chartCode([
      '  dv_col <- ' + dv + '; iv_col <- ' + iv,
      '  df_p <- df %>% filter(!is.na(.data[[dv_col]]), !is.na(.data[[iv_col]])) %>%',
      '    mutate(x_val=suppressWarnings(as.numeric(.data[[iv_col]])),',
      '           y_val=suppressWarnings(as.numeric(.data[[dv_col]]))) %>% filter(!is.na(x_val),!is.na(y_val))',
      '  r2 <- round(summary(lm(y_val~x_val,data=df_p))$r.squared,3)',
      '  p_chart <- ggplot(df_p, aes(x=x_val, y=y_val)) +',
      '    geom_point(alpha=0.45, color="#7c5cff", size=2) +',
      '    geom_smooth(method="lm", color="#e8b85c", fill="#e8b85c", alpha=0.15, linewidth=1.2, se=TRUE) +',
      '    labs(title=paste("Linear Regression:", dv_col, "~", iv_col), subtitle=paste0("R² = ",r2),',
      '         x=iv_col, y=dv_col, caption="JOANResearchOS | All values computed by R") +' + THEME_BASE,
    ].join('\n'))

    case 'descriptive_statistics': return chartCode([
      '  num_cols <- names(df)[sapply(df, function(x) is.numeric(x) ||',
      '    (!is.null(suppressWarnings(as.numeric(x))) && sum(!is.na(suppressWarnings(as.numeric(x)))) > nrow(df)*0.5))]',
      '  num_cols <- num_cols[1:min(6,length(num_cols))]',
      '  if (length(num_cols) >= 1) {',
      '    df_long <- df %>% select(all_of(num_cols)) %>%',
      '      mutate(across(everything(), ~suppressWarnings(as.numeric(.)))) %>%',
      '      tidyr::pivot_longer(everything(), names_to="variable", values_to="value") %>%',
      '      filter(!is.na(value))',
      '    p_chart <- ggplot(df_long, aes(x=variable, y=value, fill=variable)) +',
      '      geom_boxplot(alpha=0.75, outlier.alpha=0.4, width=0.5) +',
      '      stat_summary(fun=mean, geom="point", shape=18, size=4, color="#e8b85c", show.legend=FALSE) +',
      '      scale_fill_brewer(palette="Set2") +',
      '      labs(title="Distribution of Numeric Variables", subtitle="Diamond = mean | Box = IQR",',
      '           x=NULL, y="Value", caption="JOANResearchOS | All values computed by R") +' + THEME_BASE + ' +',
      '      theme(legend.position="none", axis.text.x=element_text(angle=20,hjust=1))',
      '  } else stop("No numeric columns found")',
    ].join('\n'))

    default:
      return ''
  }
}
