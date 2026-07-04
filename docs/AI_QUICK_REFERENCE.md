# JOANResearchOS — AI Assistant Quick Reference

| Field | Value |
|---|---|
| Title | AI Assistant Quick Reference |
| Version | 3.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-05 |

## What is JOANResearchOS?
A commercial statistical analysis platform for nurses, physicians, and epidemiologists in the Philippines. Users upload Excel datasets, describe their research question in plain language, and receive verified statistical output with AI interpretation — without writing R code.

**The trust contract:** All statistical values are computed exclusively by R. AI never computes statistics.

---

## Before You Touch Any Code — Non-Negotiable Rules

### 1. R computes everything. AI computes nothing.
Never compute p-values, CIs, risk ratios, or any statistical value in TypeScript/JS/AI.

### 2. Never add top-level Node.js imports
```typescript
// ✗ NEVER
import * as fs from 'fs'
// ✓ ALWAYS inside async functions
const fs = await import('fs')
```

### 3. Never store large data in React state
Use `useRef`. Base64 Excel in state crashes Safari on older devices.

### 4. Supabase client split
- `supabase.ts` = browser → client components only
- `supabase-server.ts` = server + admin → API routes only

### 5. Analysis flow is two-phase
`planAnalysis()` → assumption check panel → user approves → `executeAnalysis()`. Never merge back.

### 6. PDF generation is client-side only
`pdfReport.tsx` → dynamic import only inside async functions. Never import in API routes.

### 7. Line List Builder is entirely client-side
`sourceDetector.ts`, `phiDetector.ts`, `lineListCleaner.ts` run in the browser only. PHI never reaches any server. `/api/suggest-cleaning` receives column names + value distributions only — never row data.

### 8. Live citations are fire-and-forget
`/api/find-citations` never blocks the analysis result. Always returns 200. Never fabricate citation URLs.

### 9. Filipino translation is REMOVED
`/api/reinterpret` is deleted. `interpretROutput()` has no language parameter. Do not re-add.

### 10. auth/callback = route.ts only
Never create `page.tsx` in `app/auth/callback/`.

### 11. Free limit is 3 analyses/month
`FREE_LIMIT = 3` in `usageTracker.ts`. Team members get unlimited access via team membership check.

### 12. Interpretation must include source tags
`buildInterpretationPrompt` instructs Claude to tag every claim with `[R]`, `[WHO]`, `[CDC]`, `[EpiR]`, `[DOH]`, or `[stat]`. Do not remove these instructions.

---

## Key File Locations

| What | File |
|---|---|
| All AI prompts | `app/lib/prompts.ts` |
| Model routing | `app/lib/aiService.ts` (Haiku calls 1+2, Sonnet call 3) |
| Statistical test types | `app/types/index.ts → SupportedTest` |
| R execution | `app/lib/rExecutor.ts` |
| File storage | `app/lib/fileStorage.ts` |
| Usage tracking + team check | `app/lib/usageTracker.ts` |
| Static references | `app/lib/references.ts` |
| Source tag renderer | `app/components/AnalysisResults.tsx → renderTaggedText()` |
| Line List Builder source detection | `app/lib/sourceDetector.ts` |
| PHI column detection | `app/lib/phiDetector.ts` |
| Browser-side cleaning | `app/lib/lineListCleaner.ts` |
| Email service | `app/lib/emailService.ts` |
| Assumption checker | `app/lib/assumptionChecker.ts` |
| PDF generator | `app/lib/pdfReport.tsx` |

---

## Live URLs
| Service | URL |
|---|---|
| App | https://r-research-assistant-vx33.vercel.app |
| Line List Builder | https://r-research-assistant-vx33.vercel.app/clean |
| Team management | https://r-research-assistant-vx33.vercel.app/team |
| Admin | https://r-research-assistant-vx33.vercel.app/admin |
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
| Create `page.tsx` in `app/auth/callback/` | Breaks OAuth |
| Change Dockerfile package install order | Breaks car/lme4 compilation |
| Use a model other than haiku-4-5-20251001 or sonnet-4-6 | Architecture constraint |
| Invent numbers in AI interpretation | Scientific misconduct |
| Add new DB tables without updating SCHEMA.md | Engineering Library drift |
| Import pdfReport.tsx on the server | @react-pdf/renderer is client-only |
| Merge planAnalysis and executeAnalysis | Removes assumption check |
| Use Puppeteer on Vercel Hobby | Exceeds 50MB function limit |
| Send row-level data to /api/suggest-cleaning | PHI breach — column metadata only |
| Fabricate citation URLs in find-citations | Misrepresents sources |
| Add Filipino translation back | Removed for cost — Haiku is cheaper |
| Set FREE_LIMIT above 3 | Pricing contract — free users get 3 |

---

## Full Documentation Index
- `docs/AI_QUICK_REFERENCE.md` ← you are here
- `docs/SYSTEM_OVERVIEW.md`
- `docs/SCHEMA.md`
- `docs/PROMPTS.md`
- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `ADR/ADR-0001-R-is-the-Statistical-Engine.md`
- `ADR/ADR-0002-Supabase-Storage-for-File-Persistence.md`
- `ADR/ADR-0003-Shareable-Analysis-Links.md`
- `ADR/ADR-0004-Line-List-Builder.md`

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added new files, routes, rules |
| 3.0 | 2026-07-05 | Added Line List Builder rules, citation rules, Filipino removal, team plan, source tagging, new forbidden list |
