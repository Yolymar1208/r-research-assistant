# JOANResearchOS — Frontend Architecture

| Field | Value |
|---|---|
| Title | Frontend Architecture |
| Version | 3.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-05 |

## Complete File Map
```
app/
├── page.tsx                          ← Main analysis UI (galaxy theme)
├── layout.tsx                        ← Root layout + Space Grotesk font
├── globals.css
├── not-found.tsx                     ← Custom 404
├── error.tsx                         ← Global error boundary
├── middleware.ts                     ← Auth protection
├── types/index.ts                    ← Shared TypeScript types
│
├── lib/
│   ├── supabase.ts                   ← Browser Supabase client
│   ├── supabase-server.ts            ← Server client + supabaseAdmin
│   ├── aiService.ts                  ← Anthropic API (Haiku calls 1+2, Sonnet call 3, prompt caching)
│   ├── rExecutor.ts                  ← Calls Render R API
│   ├── prompts.ts                    ← All AI prompts (interpretation includes [R][WHO][CDC][EpiR][DOH][stat] tagging)
│   ├── usageTracker.ts               ← Usage tracking + team membership check
│   ├── rateLimiter.ts                ← Rate limiting
│   ├── fileStorage.ts                ← Supabase Storage upload/signed URL
│   ├── datasetInspector.ts           ← Excel inspection + duplicate header detection
│   ├── emailService.ts               ← Yahoo SMTP via nodemailer
│   ├── assumptionChecker.ts          ← Client-side assumption checks (all 19 tests)
│   ├── pdfReport.tsx                 ← Client-side PDF via @react-pdf/renderer (never import server-side)
│   ├── references.ts                 ← Static reference library (40+ sources, all 19 tests)
│   ├── sourceDetector.ts             ← Line List Builder: detects KoboToolbox/PIDSR/Google Forms/etc.
│   ├── phiDetector.ts                ← Line List Builder: classifies columns as PHI or analysis-safe
│   └── lineListCleaner.ts            ← Line List Builder: client-side cleaning operations
│
├── components/
│   ├── AnalysisResults.tsx           ← Tabbed results, 5 tabs including References, live citations
│   ├── DatasetSummaryPanel.tsx       ← Dataset inspection (frosted light theme)
│   ├── StatusIndicator.tsx           ← Pipeline status (frosted light theme)
│   ├── AssumptionPanel.tsx           ← Pre-flight checks between plan and execute
│   ├── OnboardingChecklist.tsx       ← First-week activation checklist (localStorage)
│   └── Starfield.tsx                 ← Animated starfield background
│
├── api/
│   ├── upload/route.ts               ← File upload + Supabase Storage + warm-up ping
│   ├── analyze/route.ts              ← AI planning + R code generation
│   ├── execute-r/route.ts            ← R execution + saves plan_json
│   ├── generate-report/route.ts      ← HTML report (all 19 tests, JOANResearchOS branding)
│   ├── generate-qgis/route.ts        ← QGIS CSV (all 19 tests)
│   ├── history/route.ts              ← Analysis history
│   ├── usage/route.ts                ← Usage status
│   ├── share/route.ts                ← Shareable analysis token (ADR-0003)
│   ├── templates/route.ts            ← Analysis templates CRUD
│   ├── notify-analysis/route.ts      ← Email via Yahoo SMTP
│   ├── suggest-questions/route.ts    ← Research question suggestions (Haiku, ~$0.002)
│   ├── suggest-cleaning/route.ts     ← Line List Builder AI suggestions (Haiku, column metadata only)
│   ├── find-citations/route.ts       ← Live citation search (Haiku + web_search tool, ~$0.003)
│   ├── team/route.ts                 ← Team management GET/POST/DELETE
│   └── admin/
│       ├── users/route.ts
│       ├── usage/route.ts
│       └── upgrade/route.ts
│
├── admin/page.tsx                    ← Admin dashboard
├── history/page.tsx                  ← Analysis history page
├── landing/page.tsx                  ← Marketing + pricing (galaxy theme, new pricing tiers)
├── login/page.tsx                    ← Login (redirect param support)
├── register/page.tsx                 ← Register (redirect param support)
├── privacy/page.tsx                  ← Privacy Policy
├── terms/page.tsx                    ← Terms of Service
├── clean/page.tsx                    ← Line List Builder (4-step, client-side, ADR-0004)
├── team/page.tsx                     ← Team management UI
├── share/[token]/page.tsx            ← Shared analysis view (requires login)
└── auth/callback/route.ts            ← OAuth callback (route.ts ONLY — no page.tsx)
```

## Critical Rules

### Rule 1 — Node.js imports must be dynamic
```typescript
// ✗ NEVER at top level
import * as fs from 'fs'
// ✓ ALWAYS inside async functions
const fs = await import('fs')
```

### Rule 2 — Supabase client split
- `supabase.ts` → browser only → `'use client'` components
- `supabase-server.ts` → server + admin → API routes only

### Rule 3 — PDF generation is client-side only
`pdfReport.tsx` uses `@react-pdf/renderer`. Never import in API routes or SSR. Dynamic import only.

### Rule 4 — Analysis flow is two-phase
`planAnalysis()` → assumption check panel → user approves → `executeAnalysis()`. Never merge back.

### Rule 5 — Line List Builder is entirely client-side
`sourceDetector.ts`, `phiDetector.ts`, `lineListCleaner.ts` — all browser-only. PHI never reaches any server. Only `/api/suggest-cleaning` touches the network, and it receives column names + value distributions only.

### Rule 6 — Live citations are fire-and-forget
`/api/find-citations` is called after execute completes and never blocks the analysis result. Always returns 200. If it fails, static references from `references.ts` cover everything.

### Rule 7 — Filipino translation is REMOVED
`/api/reinterpret` route is deleted. `interpretROutput()` no longer accepts a `language` parameter. Do not re-add.

### Rule 8 — auth/callback = route.ts only
Never create `page.tsx` in `app/auth/callback/`.

### Rule 9 — Free limit is 3
`FREE_LIMIT = 3` in `usageTracker.ts`. Team members bypass this via team membership check.

### Rule 10 — Interpretation source tagging
Claude's interpretation prompt instructs it to tag every claim with `[R]`, `[WHO]`, `[CDC]`, `[EpiR]`, `[DOH]`, or `[stat]`. These are rendered as colored inline badges in `AnalysisResults.tsx` via `renderTaggedText()`.

## Galaxy Design System
| Element | Value |
|---|---|
| Background | Starfield component (fixed, z-index 0) |
| Shell panels | rgba(18,26,48,0.65) + backdrop-filter: blur(16px) |
| Inner panels | Frosted light: rgba(240,244,250,0.97) |
| Primary accent | #7c5cff (violet — AI/Claude) |
| Secondary accent | #2e75b6 (blue — R/data) |
| Gold accent | #e8b85c (warnings, new features, citations) |
| Success | #4ade80 |
| Display font | Space Grotesk |
| Body font | Inter / system-ui |

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added new components, routes, pages, two-phase flow |
| 3.0 | 2026-07-05 | Added Line List Builder files, references.ts, find-citations, suggest-questions, team; removed Filipino translation; updated rules |
