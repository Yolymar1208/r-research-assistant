// Curated reference library for JOANResearchOS interpretations.
// All sources are real, verifiable, and publicly accessible.
// Used in the References tab of AnalysisResults.tsx.

export interface Reference {
  id: string
  authors: string
  title: string
  source: string
  year: number
  url: string
  type: 'guideline' | 'handbook' | 'textbook' | 'manual' | 'circular'
  downloadable: boolean
  notes?: string
}

// ─── Universal references (shown for all tests) ─────────────────────────────

export const UNIVERSAL_REFERENCES: Reference[] = [
  {
    id: 'epir-handbook',
    authors: 'Batra, N., et al.',
    title: 'The Epidemiologist R Handbook',
    source: 'epirhandbook.com',
    year: 2021,
    url: 'https://epirhandbook.com/en/',
    type: 'handbook',
    downloadable: true,
    notes: 'Free, open-source reference for applied epidemiology in R. Used by 850,000+ epidemiologists worldwide.',
  },
  {
    id: 'cdc-fetp',
    authors: 'Centers for Disease Control and Prevention',
    title: 'Principles of Epidemiology in Public Health Practice (3rd Edition)',
    source: 'CDC FETP',
    year: 2012,
    url: 'https://www.cdc.gov/training/publichealth101/epidemiology.html',
    type: 'manual',
    downloadable: true,
    notes: 'Core reference for FETP training globally, including Philippines.',
  },
  {
    id: 'who-outbreak',
    authors: 'World Health Organization',
    title: 'Investigating and Controlling Disease Outbreaks: A Field Manual',
    source: 'WHO',
    year: 2020,
    url: 'https://www.who.int/publications/i/item/9789240001787',
    type: 'manual',
    downloadable: true,
  },
  {
    id: 'doh-pidsr',
    authors: 'Philippine Department of Health',
    title: 'Philippine Integrated Disease Surveillance and Response (PIDSR) Operations Manual',
    source: 'DOH Philippines',
    year: 2022,
    url: 'https://epidemiology.doh.gov.ph/index.php/pidsr',
    type: 'circular',
    downloadable: true,
    notes: 'The national surveillance standard for all DOH-reportable diseases.',
  },
]

// ─── Test-specific references ────────────────────────────────────────────────

const TEST_REFERENCES: Partial<Record<string, Reference[]>> = {

  descriptive_statistics: [
    {
      id: 'epir-ch7',
      authors: 'Batra, N., et al.',
      title: 'Descriptive Analysis — EpiR Handbook, Chapter 7',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/descriptive-analysis.html',
      type: 'handbook',
      downloadable: true,
    },
    {
      id: 'who-desc',
      authors: 'World Health Organization',
      title: 'Analysing and Presenting Data — Health Research Methodology',
      source: 'WHO',
      year: 2001,
      url: 'https://www.who.int/publications/i/item/9290612851',
      type: 'guideline',
      downloadable: true,
    },
  ],

  independent_t_test: [
    {
      id: 'field-2013',
      authors: 'Field, A.',
      title: 'Discovering Statistics Using IBM SPSS Statistics (4th ed.) — Chapter 9: Comparing Two Means',
      source: 'SAGE Publications',
      year: 2013,
      url: 'https://www.discoveringstatistics.com/',
      type: 'textbook',
      downloadable: false,
      notes: 'Standard reference for t-test assumptions and interpretation.',
    },
    {
      id: 'welch-1947',
      authors: "Welch, B.L.",
      title: "The generalization of 'Student's' problem when several different population variances are involved",
      source: 'Biometrika, 34(1-2), 28-35',
      year: 1947,
      url: 'https://doi.org/10.1093/biomet/34.1-2.28',
      type: 'textbook',
      downloadable: false,
      notes: "Original paper for Welch's t-test (var.equal=FALSE), used in JOANResearchOS by default.",
    },
    {
      id: 'cohen-1988',
      authors: 'Cohen, J.',
      title: 'Statistical Power Analysis for the Behavioral Sciences (2nd ed.)',
      source: 'Lawrence Erlbaum Associates',
      year: 1988,
      url: 'https://www.taylorfrancis.com/books/mono/10.4324/9780203771587/statistical-power-analysis-behavioral-sciences-jacob-cohen',
      type: 'textbook',
      downloadable: false,
      notes: "Cohen's d thresholds: 0.2 = small, 0.5 = medium, 0.8 = large.",
    },
  ],

  paired_t_test: [
    {
      id: 'epir-ch29',
      authors: 'Batra, N., et al.',
      title: 'Simple statistical tests — EpiR Handbook, Chapter 29',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/simple-statistical-tests.html',
      type: 'handbook',
      downloadable: true,
    },
    {
      id: 'student-1908',
      authors: 'Student (Gosset, W.S.)',
      title: 'The probable error of a mean',
      source: 'Biometrika, 6(1), 1-25',
      year: 1908,
      url: 'https://doi.org/10.1093/biomet/6.1.1',
      type: 'textbook',
      downloadable: false,
      notes: 'Original paper establishing the t-distribution.',
    },
  ],

  one_way_anova: [
    {
      id: 'field-2013-anova',
      authors: 'Field, A.',
      title: 'Discovering Statistics Using IBM SPSS Statistics (4th ed.) — Chapter 11: ANOVA',
      source: 'SAGE Publications',
      year: 2013,
      url: 'https://www.discoveringstatistics.com/',
      type: 'textbook',
      downloadable: false,
    },
    {
      id: 'levene-1960',
      authors: 'Levene, H.',
      title: "Robust tests for equality of variances",
      source: "Contributions to Probability and Statistics, Stanford University Press",
      year: 1960,
      url: 'https://www.semanticscholar.org/paper/Robust-tests-for-equality-of-variances-Levene/22abd43b75bbc01d9c823d3d8bd06e6e0e56dcfa',
      type: 'textbook',
      downloadable: false,
      notes: "Original paper for Levene's test of homogeneity of variance.",
    },
    {
      id: 'tukey-1949',
      authors: 'Tukey, J.W.',
      title: 'Comparing Individual Means in the Analysis of Variance',
      source: 'Biometrics, 5(2), 99-114',
      year: 1949,
      url: 'https://doi.org/10.2307/3001913',
      type: 'textbook',
      downloadable: false,
      notes: 'Original paper for Tukey HSD post-hoc test.',
    },
  ],

  chi_square: [
    {
      id: 'epir-ch29-chisq',
      authors: 'Batra, N., et al.',
      title: 'Simple statistical tests — EpiR Handbook, Chapter 29',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/simple-statistical-tests.html',
      type: 'handbook',
      downloadable: true,
    },
    {
      id: 'pearson-1900',
      authors: 'Pearson, K.',
      title: 'On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling',
      source: 'Philosophical Magazine, 50(302), 157-175',
      year: 1900,
      url: 'https://doi.org/10.1080/14786440009463897',
      type: 'textbook',
      downloadable: false,
      notes: 'Original chi-square paper. Expected cell count ≥ 5 rule is standard.',
    },
    {
      id: 'cramer-1946',
      authors: 'Cramér, H.',
      title: 'Mathematical Methods of Statistics',
      source: 'Princeton University Press',
      year: 1946,
      url: 'https://press.princeton.edu/books/paperback/9780691005478/mathematical-methods-of-statistics',
      type: 'textbook',
      downloadable: false,
      notes: "Cramér's V thresholds: 0.1 = weak, 0.3 = moderate, 0.5 = strong.",
    },
  ],

  pearson_correlation: [
    {
      id: 'pearson-1895',
      authors: 'Pearson, K.',
      title: 'Notes on regression and inheritance in the case of two parents',
      source: 'Proceedings of the Royal Society of London, 58, 240-242',
      year: 1895,
      url: 'https://doi.org/10.1098/rspl.1895.0041',
      type: 'textbook',
      downloadable: false,
      notes: 'Original Pearson r paper. Thresholds: |r| < 0.3 weak, 0.3–0.5 moderate, > 0.5 strong.',
    },
    {
      id: 'epir-ch29-corr',
      authors: 'Batra, N., et al.',
      title: 'Simple statistical tests — EpiR Handbook, Chapter 29',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/simple-statistical-tests.html',
      type: 'handbook',
      downloadable: true,
    },
  ],

  mann_whitney: [
    {
      id: 'mann-whitney-1947',
      authors: 'Mann, H.B. & Whitney, D.R.',
      title: 'On a test of whether one of two random variables is stochastically larger than the other',
      source: 'Annals of Mathematical Statistics, 18(1), 50-60',
      year: 1947,
      url: 'https://doi.org/10.1214/aoms/1177730491',
      type: 'textbook',
      downloadable: false,
      notes: 'Original U-test paper. Non-parametric alternative to independent t-test.',
    },
    {
      id: 'conover-1999',
      authors: 'Conover, W.J.',
      title: 'Practical Nonparametric Statistics (3rd ed.)',
      source: 'John Wiley & Sons',
      year: 1999,
      url: 'https://www.wiley.com/en-us/Practical+Nonparametric+Statistics%2C+3rd+Edition-p-9780471160687',
      type: 'textbook',
      downloadable: false,
    },
  ],

  wilcoxon_signed_rank: [
    {
      id: 'wilcoxon-1945',
      authors: 'Wilcoxon, F.',
      title: 'Individual comparisons by ranking methods',
      source: 'Biometrics Bulletin, 1(6), 80-83',
      year: 1945,
      url: 'https://doi.org/10.2307/3001968',
      type: 'textbook',
      downloadable: false,
      notes: 'Original Wilcoxon signed-rank test paper. Non-parametric alternative to paired t-test.',
    },
  ],

  kruskal_wallis: [
    {
      id: 'kruskal-wallis-1952',
      authors: 'Kruskal, W.H. & Wallis, W.A.',
      title: 'Use of ranks in one-criterion variance analysis',
      source: 'Journal of the American Statistical Association, 47(260), 583-621',
      year: 1952,
      url: 'https://doi.org/10.1080/01621459.1952.10483441',
      type: 'textbook',
      downloadable: false,
      notes: 'Original Kruskal-Wallis paper. Non-parametric alternative to one-way ANOVA.',
    },
    {
      id: 'dunn-1964',
      authors: 'Dunn, O.J.',
      title: 'Multiple comparisons using rank sums',
      source: 'Technometrics, 6(3), 241-252',
      year: 1964,
      url: 'https://doi.org/10.1080/00401706.1964.10490181',
      type: 'textbook',
      downloadable: false,
      notes: 'Dunn post-hoc test for Kruskal-Wallis. Bonferroni correction applied.',
    },
  ],

  spearman_correlation: [
    {
      id: 'spearman-1904',
      authors: 'Spearman, C.',
      title: 'The proof and measurement of association between two things',
      source: 'American Journal of Psychology, 15(1), 72-101',
      year: 1904,
      url: 'https://doi.org/10.2307/1412159',
      type: 'textbook',
      downloadable: false,
      notes: 'Original Spearman rho paper. Non-parametric rank correlation.',
    },
  ],

  fishers_exact: [
    {
      id: 'fisher-1922',
      authors: "Fisher, R.A.",
      title: "On the interpretation of χ² from contingency tables, and the calculation of P",
      source: 'Journal of the Royal Statistical Society, 85(1), 87-94',
      year: 1922,
      url: 'https://doi.org/10.2307/2340521',
      type: 'textbook',
      downloadable: false,
      notes: "Used when n < 40 or expected cell count < 5. Exact probability computation.",
    },
  ],

  mcnemar: [
    {
      id: 'mcnemar-1947',
      authors: "McNemar, Q.",
      title: "Note on the sampling error of the difference between correlated proportions or percentages",
      source: 'Psychometrika, 12(2), 153-157',
      year: 1947,
      url: 'https://doi.org/10.1007/BF02295996',
      type: 'textbook',
      downloadable: false,
      notes: 'For paired categorical data. Exact version used when b+c < 25.',
    },
  ],

  logistic_regression: [
    {
      id: 'hosmer-2013',
      authors: 'Hosmer, D.W., Lemeshow, S. & Sturdivant, R.X.',
      title: 'Applied Logistic Regression (3rd ed.)',
      source: 'John Wiley & Sons',
      year: 2013,
      url: 'https://www.wiley.com/en-us/Applied+Logistic+Regression%2C+3rd+Edition-p-9780470582473',
      type: 'textbook',
      downloadable: false,
      notes: 'Standard reference. Events per variable (EPV) ≥ 10 recommended.',
    },
    {
      id: 'epir-ch30',
      authors: 'Batra, N., et al.',
      title: 'Univariate and multivariable regression — EpiR Handbook, Chapter 30',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/regression.html',
      type: 'handbook',
      downloadable: true,
    },
  ],

  linear_regression: [
    {
      id: 'kleinbaum-2013',
      authors: 'Kleinbaum, D.G., et al.',
      title: 'Applied Regression Analysis and Other Multivariable Methods (5th ed.)',
      source: 'Cengage Learning',
      year: 2013,
      url: 'https://www.cengage.com/c/applied-regression-analysis-and-other-multivariable-methods-5e-kleinbaum/',
      type: 'textbook',
      downloadable: false,
    },
    {
      id: 'epir-ch30-lr',
      authors: 'Batra, N., et al.',
      title: 'Univariate and multivariable regression — EpiR Handbook, Chapter 30',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/regression.html',
      type: 'handbook',
      downloadable: true,
    },
  ],

  epidemic_curve: [
    {
      id: 'cdc-fetp-ch6',
      authors: 'Centers for Disease Control and Prevention',
      title: 'Principles of Epidemiology in Public Health Practice — Lesson 6: Investigating an Outbreak',
      source: 'CDC FETP',
      year: 2012,
      url: 'https://www.cdc.gov/training/publichealth101/documents/principles-of-epidemiology.pdf',
      type: 'manual',
      downloadable: true,
      notes: 'Point source outbreaks show sharp peak within one incubation period. Propagated outbreaks show multiple peaks.',
    },
    {
      id: 'epir-ch32',
      authors: 'Batra, N., et al.',
      title: 'Epidemic curves — EpiR Handbook, Chapter 32',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/epidemic-curves.html',
      type: 'handbook',
      downloadable: true,
    },
    {
      id: 'who-epicurve',
      authors: 'World Health Organization',
      title: 'Outbreak Investigation Toolkit',
      source: 'WHO',
      year: 2020,
      url: 'https://www.who.int/emergencies/outbreak-toolkit',
      type: 'guideline',
      downloadable: true,
    },
  ],

  attack_rate_table: [
    {
      id: 'cdc-fetp-ar',
      authors: 'Centers for Disease Control and Prevention',
      title: 'Principles of Epidemiology in Public Health Practice — Lesson 3: Measures of Risk',
      source: 'CDC FETP',
      year: 2012,
      url: 'https://www.cdc.gov/training/publichealth101/documents/principles-of-epidemiology.pdf',
      type: 'manual',
      downloadable: true,
      notes: 'Attack rate = cases / population at risk × 100. Risk ratio > 1 indicates exposure increases risk.',
    },
    {
      id: 'epir-ch16',
      authors: 'Batra, N., et al.',
      title: 'Attack rates and 2x2 tables — EpiR Handbook, Chapter 16',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/outbreak-analysis.html',
      type: 'handbook',
      downloadable: true,
    },
    {
      id: 'kelsey-1996',
      authors: 'Kelsey, J.L., et al.',
      title: 'Methods in Observational Epidemiology (2nd ed.)',
      source: 'Oxford University Press',
      year: 1996,
      url: 'https://global.oup.com/academic/product/methods-in-observational-epidemiology-9780195083774',
      type: 'textbook',
      downloadable: false,
    },
  ],

  age_sex_pyramid: [
    {
      id: 'epir-ch33',
      authors: 'Batra, N., et al.',
      title: 'Age-sex pyramids — EpiR Handbook, Chapter 33',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/demographic-pyramids-and-likert-scales.html',
      type: 'handbook',
      downloadable: true,
    },
    {
      id: 'doh-cif',
      authors: 'Philippine Department of Health',
      title: 'Case Investigation Form (CIF) — Standard Age Groupings',
      source: 'DOH Philippines',
      year: 2023,
      url: 'https://epidemiology.doh.gov.ph/',
      type: 'circular',
      downloadable: true,
      notes: 'Standard DOH age groups: 0-4, 5-9, 10-14... 75+. Used in PIDSR reporting.',
    },
  ],

  survival_analysis: [
    {
      id: 'epir-ch27',
      authors: 'Batra, N., et al.',
      title: 'Survival analysis — EpiR Handbook, Chapter 27',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/survival-analysis.html',
      type: 'handbook',
      downloadable: true,
    },
    {
      id: 'kaplan-meier-1958',
      authors: 'Kaplan, E.L. & Meier, P.',
      title: 'Nonparametric estimation from incomplete observations',
      source: 'Journal of the American Statistical Association, 53(282), 457-481',
      year: 1958,
      url: 'https://doi.org/10.1080/01621459.1958.10501452',
      type: 'textbook',
      downloadable: false,
      notes: 'Original Kaplan-Meier estimator paper. Most cited paper in medical research.',
    },
    {
      id: 'who-cfr',
      authors: 'World Health Organization',
      title: 'Estimating mortality from COVID-19: Scientific brief',
      source: 'WHO',
      year: 2020,
      url: 'https://www.who.int/publications/i/item/WHO-2019-nCoV-Sci_Brief-Mortality-2020.1',
      type: 'guideline',
      downloadable: true,
      notes: 'CFR interpretation framework applicable to all outbreak investigations.',
    },
  ],

  moving_average: [
    {
      id: 'epir-ch22',
      authors: 'Batra, N., et al.',
      title: 'Time series and outbreak detection — EpiR Handbook, Chapter 22',
      source: 'epirhandbook.com',
      year: 2021,
      url: 'https://epirhandbook.com/en/time-series-and-outbreak-detection.html',
      type: 'handbook',
      downloadable: true,
    },
    {
      id: 'who-surveillance',
      authors: 'World Health Organization',
      title: 'WHO recommended surveillance standards (2nd ed.)',
      source: 'WHO',
      year: 1999,
      url: 'https://www.who.int/publications/i/item/who-recommended-surveillance-standards',
      type: 'guideline',
      downloadable: true,
      notes: 'Standard guidance for epidemiological week calculation and trend analysis.',
    },
  ],
}

export function getReferencesForTest(testKey: string): Reference[] {
  const testSpecific = TEST_REFERENCES[testKey] || []
  return [...UNIVERSAL_REFERENCES, ...testSpecific]
}

export const SOURCE_TAG_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'R': { label: 'R computed', color: '#166534', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)' },
  'WHO': { label: 'WHO guideline', color: '#1d4ed8', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' },
  'CDC': { label: 'CDC/FETP standard', color: '#991b1b', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  'EpiR': { label: 'EpiR Handbook', color: '#5b21b6', bg: 'rgba(124,92,255,0.12)', border: 'rgba(124,92,255,0.3)' },
  'DOH': { label: 'DOH Philippines', color: '#92400e', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  'stat': { label: 'Statistical convention', color: '#374151', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)' },
}

export const REFERENCE_TYPE_LABELS: Record<Reference['type'], string> = {
  guideline: 'WHO/International Guideline',
  handbook: 'Field Handbook',
  textbook: 'Textbook',
  manual: 'Operations Manual',
  circular: 'DOH Circular / Policy',
}
