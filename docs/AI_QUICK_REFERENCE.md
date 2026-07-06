# JOANResearchOS — AI Assistant Quick Reference

| Field | Value |
|---|---|
| Title | AI Assistant Quick Reference |
| Version | 4.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-06 |

## What is JOANResearchOS?
A commercial statistical analysis platform for nurses, physicians, and epidemiologists in the Philippines. Users upload Excel datasets, describe their research question in plain language, and receive verified statistical output with AI interpretation, charts, PDF reports, and PowerPoint slides — without writing R code.

**The trust contract:** All statistical values are computed exclusively by R. AI never computes statistics.

---

## Before You Touch Any Code — Non-Negotiable Rules

1. R computes everything. AI computes nothing. Never compute p-values, CIs, risk ratios, or any statistical value in TypeScript/JS/AI.
2. Never add top-level Node.js imports — use dynamic import inside async functions
3. Supabase client split — supabase.ts = browser, supabase-server.ts = API routes
4. Analysis flow is two-phase — planAnalysis() → assumption check → executeAnalysis()
5. PDF generation is client-side only — pdfReport.tsx, dynamic import only, never in API routes
6. Line List Builder is entirely client-side — PHI never reaches any server
7. Live citations are fire-and-forget — /api/find-citations always returns 200, never blocks
8. Filipino translation is REMOVED — /api/reinterpret deleted, do not re-add
9. auth/callback = route.ts only — never create page.tsx in app/auth/callback/
10. Free limit is 3 — FREE_LIMIT = 3 in usageTracker.ts
11. Interpretation must include source tags — [R][WHO][CDC][EpiR][DOH][stat]
12. chartBase64 must be copied in page.tsx — the execution object rebuild in page.tsx must include `chartBase64: (execData as any)?.chartBase64`
13. Safari/iOS requires blob URL — convert chartBase64 → Blob → ObjectURL in useEffect before using in img src
14. Chart code uses array joins not template literals — avoids TypeScript parse errors in chartGenerator.ts
15. Age-sex pyramid uses unmodified data source — try `data` variable first, not `clean` (AI may recode sex to 0/1)
16. McNemar has no chart by design — requires paired categorical data at two timepoints
17. PowerPoint uses pptxgenjs — server-side, zero Anthropic API cost
18. pptxgenjs shapes accessed via `(pres as any).shapes` — TypeScript type workaround required

---

## Key File Locations

| What | File |
|---|---|
| All AI prompts | app/lib/prompts.ts |
| Model routing | app/lib/aiService.ts |
| Statistical test types | app/types/index.ts → SupportedTest |
| R execution + chart extraction | app/lib/rExecutor.ts |
| Chart code appended to R script | app/api/execute-r/route.ts |
| Hardcoded chart R code (18 tests) | app/lib/chartGenerator.ts |
| Static references | app/lib/references.ts |
| Source tag renderer | app/components/AnalysisResults.tsx → renderTaggedText() |
| Safari blob URL conversion | app/components/AnalysisResults.tsx → useEffect on chartBase64 |
| PDF with chart | app/lib/pdfReport.tsx → downloadReportAsPdf(result, name, chartBase64) |
| PowerPoint with chart | app/api/generate-pptx/route.ts |
| Usage tracking + team check | app/lib/usageTracker.ts |
| Line List Builder source detection | app/lib/sourceDetector.ts |
| PHI column detection | app/lib/phiDetector.ts |
| Browser-side cleaning | app/lib/lineListCleaner.ts |

---

## Live URLs
| Service | URL |
|---|---|
| App | https://joanresearch.com |
| Line List Builder | https://joanresearch.com/clean |
| Team management | https://joanresearch.com/team |
| Admin | https://joanresearch.com/admin |
| R API | https://r-plumber-api-rc95.onrender.com |

---

## Current Statistical Tests (19 total)
**Parametric (6):** descriptive_statistics, independent_t_test, paired_t_test, one_way_anova, chi_square, pearson_correlation
**Non-Parametric (6):** mann_whitney, wilcoxon_signed_rank, kruskal_wallis, spearman_correlation, fishers_exact, mcnemar
**Regression (2):** logistic_regression, linear_regression
**Epidemiology (5):** epidemic_curve, attack_rate_table, age_sex_pyramid, survival_analysis, moving_average

---

## Do Not Do These Things
| Forbidden | Why |
|---|---|
| Compute statistics in TypeScript/JS | Violates trust contract |
| Add `import * as fs` at top level | Crashes client bundle |
| Store base64 in React state | Crashes Safari on old devices |
| Create `page.tsx` in app/auth/callback/ | Breaks OAuth |
| Change Dockerfile package install order | Breaks car/lme4 compilation |
| Use a model other than haiku-4-5-20251001 or sonnet-4-6 | Architecture constraint |
| Invent numbers in AI interpretation | Scientific misconduct |
| Add new DB tables without updating SCHEMA.md | Engineering Library drift |
| Import pdfReport.tsx on the server | @react-pdf/renderer is client-only |
| Merge planAnalysis and executeAnalysis | Removes assumption check |
| Use Puppeteer on Vercel Hobby | Exceeds 50MB function limit |
| Send row-level data to /api/suggest-cleaning | PHI breach |
| Fabricate citation URLs in find-citations | Misrepresents sources |
| Add Filipino translation back | Removed for cost |
| Set FREE_LIMIT above 3 | Pricing contract |
| Use template literals for R code in chartGenerator.ts | TypeScript parse errors |
| Use `pres.shapes` directly in pptxgenjs | TypeScript type error — use `(pres as any).shapes` |
| Skip chartBase64 copy in page.tsx | Chart tab never appears |
| Use raw base64 in img src (Safari) | Large data URIs crash Safari |
| Use `filter()` for moving average | dplyr masks stats::filter() — use manual loop |
| Use tidyr::pivot_longer in paired charts | Not always available in Render env |
| Use `clean` variable for age-sex pyramid | AI may recode sex to 0/1 |

---

## Full Documentation Index
- docs/AI_QUICK_REFERENCE.md ← you are here
- docs/SYSTEM_OVERVIEW.md
- docs/SCHEMA.md
- docs/PROMPTS.md
- docs/FRONTEND_ARCHITECTURE.md
- docs/DEPLOYMENT.md
- ADR/ADR-0001 through ADR-0004

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added new files, routes, rules |
| 3.0 | 2026-07-05 | Added Line List Builder, citation, Filipino removal, team plan, source tagging |
| 4.0 | 2026-07-06 | Added chart pipeline rules 12-18; PowerPoint rules; forbidden list expanded |
