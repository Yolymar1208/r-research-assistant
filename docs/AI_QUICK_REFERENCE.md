# JOANResearchOS — AI Assistant Quick Reference

| Field | Value |
|---|---|
| Title | AI Assistant Quick Reference |
| Version | 2.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-02 |

## What is JOANResearchOS?
A commercial statistical analysis platform for nurses, physicians, and epidemiologists in the Philippines. Users upload Excel datasets, describe their research question, and receive verified statistical output with AI interpretation — without writing R code.

**The trust contract:** All statistical values are computed exclusively by R. AI never computes statistics.

---

## Before You Touch Any Code

### 1. R computes everything. AI computes nothing.
Never compute p-values, CIs, risk ratios, or any statistical value in TypeScript/JS/AI. Route through R.

### 2. Never add top-level Node.js imports
```typescript
// ✗ NEVER
import * as fs from 'fs'
// ✓ ALWAYS inside async functions
const fs = await import('fs')
```

### 3. Never store large data in React state
Use `useRef`. Base64 Excel files in state crash Safari on older devices.

### 4. File path flow
Upload → Supabase Storage → fresh signed URL at execute time → `download.file()` in R script.

### 5. Supabase client split
- `supabase.ts` = browser → `'use client'` components only
- `supabase-server.ts` = server + admin → API routes only

### 6. Analysis flow is two-phase
`planAnalysis()` → assumption check panel → user approves → `executeAnalysis()`. Never merge back into one call.

### 7. PDF generation is client-side only
`app/lib/pdfReport.tsx` uses `@react-pdf/renderer`. Dynamic import only inside async functions. Never call from API routes or SSR.

### 8. Language parameter
`interpretROutput(plan, rScript, rawOutput, language: 'english' | 'filipino')`. The `/api/reinterpret` route handles language switching without re-running R or consuming a credit.

### 9. auth/callback = route.ts only
Never create `page.tsx` in `app/auth/callback/`.

### 10. Dockerfile package install order is strict
Do not change: Matrix → lme4 → pbkrtest → carData → car → all others.

---

## Key File Locations

| What | File |
|---|---|
| All AI prompts | `app/lib/prompts.ts` |
| Statistical test types | `app/types/index.ts → SupportedTest` |
| R execution | `app/lib/rExecutor.ts` |
| File storage | `app/lib/fileStorage.ts` |
| Usage tracking + history | `app/lib/usageTracker.ts` |
| Rate limiting | `app/lib/rateLimiter.ts` |
| Assumption checker | `app/lib/assumptionChecker.ts` |
| PDF generator | `app/lib/pdfReport.tsx` |
| Email service | `app/lib/emailService.ts` |
| Starfield background | `app/components/Starfield.tsx` |
| Onboarding checklist | `app/components/OnboardingChecklist.tsx` |
| Assumption panel | `app/components/AssumptionPanel.tsx` |
| Main UI | `app/page.tsx` |
| Results display | `app/components/AnalysisResults.tsx` |
| Shared analysis page | `app/share/[token]/page.tsx` |
| R API | `r-plumber-api/plumber.R` |
| R Docker | `r-plumber-api/Dockerfile` |

---

## Live URLs
| Service | URL |
|---|---|
| App | https://r-research-assistant-vx33.vercel.app |
| R API | https://r-plumber-api-rc95.onrender.com |
| Admin | https://r-research-assistant-vx33.vercel.app/admin |

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
| Use a model other than claude-sonnet-4-6 | Architecture constraint |
| Invent numbers in AI interpretation | Scientific misconduct |
| Add new DB tables without updating SCHEMA.md | Engineering Library gets out of sync |
| Import pdfReport.tsx on the server | @react-pdf/renderer is client-only |
| Merge planAnalysis and executeAnalysis | Removes assumption check step |
| Use Puppeteer on Vercel Hobby | Exceeds 50MB function size limit |

---

## Full Documentation Index
- `00_Governance/MASTER_RULES.md`
- `02_Architecture/SYSTEM_OVERVIEW.md`
- `03_Database/SCHEMA.md`
- `05_AI/PROMPTS.md`
- `06_R_Engine/STATISTICAL_TESTS.md`
- `07_Frontend/FRONTEND_ARCHITECTURE.md`
- `09_DevOps/DEPLOYMENT.md`
- `ADR/ADR-0001-R-is-the-Statistical-Engine.md`
- `ADR/ADR-0002-Supabase-Storage-for-File-Persistence.md`
- `ADR/ADR-0003-Shareable-Analysis-Links.md`

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added all new files, routes, rules for PDF/language/share/two-phase flow |
