# JOANResearchOS — Frontend Architecture

| Field | Value |
|---|---|
| Title | Frontend Architecture |
| Version | 2.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-02 |

## Purpose
Documents the Next.js frontend structure, key files, and critical rules.

## App Router Structure
```
app/
├── page.tsx                      ← Main analysis UI (protected, galaxy theme)
├── layout.tsx                    ← Root layout + Space Grotesk font + viewport meta
├── globals.css
├── types/
│   └── index.ts
├── lib/
│   ├── supabase.ts               ← Browser Supabase client
│   ├── supabase-server.ts        ← Server Supabase client + supabaseAdmin
│   ├── aiService.ts              ← Anthropic API: createAnalysisPlan, generateRScript, interpretROutput(language)
│   ├── rExecutor.ts              ← Calls Render R API
│   ├── prompts.ts                ← All AI prompt templates (buildInterpretationPrompt takes language param)
│   ├── usageTracker.ts           ← Usage tracking + history saving (stores plan_json)
│   ├── rateLimiter.ts            ← Rate limiting
│   ├── fileStorage.ts            ← Supabase Storage upload/download/signed URL
│   ├── datasetInspector.ts       ← Excel inspection + duplicate header detection + warnings[]
│   ├── emailService.ts           ← Yahoo SMTP email via nodemailer
│   ├── assumptionChecker.ts      ← Client-side assumption checks for all 19 tests
│   └── pdfReport.tsx             ← Client-side vector PDF via @react-pdf/renderer
├── components/
│   ├── AnalysisResults.tsx       ← Tabbed results, provenance badges, share/PDF/QGIS buttons, language toggle
│   ├── DatasetSummaryPanel.tsx   ← Dataset inspection + warnings (frosted light theme)
│   ├── StatusIndicator.tsx       ← Pipeline status steps (frosted light theme)
│   ├── AssumptionPanel.tsx       ← Pre-flight assumption checks between plan and execute
│   ├── OnboardingChecklist.tsx   ← First-week activation checklist (localStorage)
│   └── Starfield.tsx             ← Animated starfield background (galaxy theme)
├── api/
│   ├── upload/route.ts           ← File upload + warm-up R API ping
│   ├── analyze/route.ts          ← AI planning + R code generation
│   ├── execute-r/route.ts        ← R execution + interpretation + saves plan_json to history
│   ├── reinterpret/route.ts      ← Re-calls Claude in Filipino/English without re-running R
│   ├── generate-report/route.ts  ← HTML report (all 19 test labels, JOANResearchOS branding)
│   ├── generate-qgis/route.ts    ← QGIS CSV for all 19 tests
│   ├── history/route.ts          ← Analysis history (includes plan_json)
│   ├── usage/route.ts            ← Usage status
│   ├── share/route.ts            ← Creates shareable analysis token (ADR-0003)
│   ├── templates/route.ts        ← GET/POST/DELETE analysis templates
│   ├── notify-analysis/route.ts  ← Sends analysis-complete email via Yahoo SMTP
│   └── admin/
│       ├── users/route.ts
│       ├── usage/route.ts
│       └── upgrade/route.ts
├── admin/page.tsx                ← Admin dashboard (galaxy theme, near-limit alerts, search)
├── history/page.tsx              ← Analysis history (search, filter, PDF/output/R download, re-run)
├── landing/page.tsx              ← Marketing + pricing page
├── login/page.tsx                ← Login (galaxy theme, redirect param support)
├── register/page.tsx             ← Register (galaxy theme, redirect param support)
├── privacy/page.tsx              ← Privacy Policy
├── terms/page.tsx                ← Terms of Service
├── share/[token]/page.tsx        ← Public shared analysis view (requires login)
└── auth/callback/route.ts        ← OAuth callback (route.ts ONLY — no page.tsx)
middleware.ts                     ← Protects all routes, redirects to /login
not-found.tsx                     ← Custom 404 (galaxy theme)
error.tsx                         ← Global error boundary (galaxy theme)
```

## Critical Frontend Rules

### Rule 1 — Node.js Imports Must Be Dynamic
```typescript
// ✗ NEVER
import * as fs from 'fs'
// ✓ ALWAYS inside async functions
const fs = await import('fs')
```

### Rule 2 — Supabase Client Split
- `supabase.ts` → browser client → `'use client'` components only
- `supabase-server.ts` → server client + `supabaseAdmin` → API routes only
- NEVER import `supabase-server.ts` in a client component

### Rule 3 — No Large Binary in React State
Use `useRef` for large data. Base64 in state crashes Safari on older devices.

### Rule 4 — auth/callback Must Be route.ts Only
No `page.tsx` in `app/auth/callback/` — breaks OAuth routing.

### Rule 5 — storagePath Flow
Upload → Supabase Storage → fresh signed URL at execute time → `download.file()` in R script.

### Rule 6 — PDF Generation Is Client-Side Only
`app/lib/pdfReport.tsx` uses `@react-pdf/renderer`. Never import in server components or API routes. Dynamic import only: `await import('@react-pdf/renderer')`.

### Rule 7 — Analysis Flow Is Two-Phase
`planAnalysis()` → assumption check panel → user approves → `executeAnalysis()`. Never combine into one call again — this separation allows users to review before consuming an analysis credit.

### Rule 8 — Language Parameter on Interpretation
`interpretROutput(plan, rScript, rawOutput, language)` — `language` defaults to `'english'`. The `/api/reinterpret` route handles language switching without re-running R.

## Galaxy Design System
| Element | Value |
|---|---|
| Background | Starfield component (fixed, z-index 0) |
| Shell panels | `rgba(18,26,48,0.65)` + `backdrop-filter: blur(16px)` |
| Inner panels | Frosted light: `rgba(240,244,250,0.97)` |
| Primary accent | `#7c5cff` (violet — AI/Claude) |
| Secondary accent | `#2e75b6` (blue — R/data) |
| Success | `#4ade80` |
| Warning | `#e8b85c` (gold) |
| Display font | Space Grotesk (via next/font, CSS var: `--font-space-grotesk`) |
| Body font | Inter / system-ui |

## Plans and Pricing
| Plan | Price | analyses_limit |
|---|---|---|
| Free | ₱0/month | 5 |
| Pro | ₱999/month | Unlimited |
| Institution | ₱4,999/month | Unlimited |

Payment: Manual GCash/bank transfer → admin upgrades via dashboard.

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added all new components, routes, pages, design system, two-phase analysis flow |
