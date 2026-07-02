# JOANResearchOS — System Architecture Overview

| Field | Value |
|---|---|
| Title | System Architecture Overview |
| Version | 2.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-02 |

## Purpose
Describes the complete system architecture of JOANResearchOS.

## Live URLs
| Service | URL |
|---|---|
| Frontend (production) | https://r-research-assistant-vx33.vercel.app |
| Landing page | https://r-research-assistant-vx33.vercel.app/landing |
| Admin dashboard | https://r-research-assistant-vx33.vercel.app/admin |
| R Plumber API | https://r-plumber-api-rc95.onrender.com |
| Supabase project | https://mwfsfdloprvawgzljolh.supabase.co |

## GitHub Repositories
| Repo | URL | Purpose |
|---|---|---|
| Frontend | https://github.com/Yolymar1208/r-research-assistant | Next.js 14 app |
| R API | https://github.com/Yolymar1208/r-plumber-api | R Plumber Docker API |

## Architecture Diagram
```
Browser (User)
    │
    ▼
Vercel (Next.js 14)
    │
    ├─── /api/upload              ← Receives Excel, stores to Supabase Storage, warm-up R API
    ├─── /api/analyze             ← AI plans test + generates R code
    ├─── /api/execute-r           ← Injects signed URL, sends to Render, saves history
    ├─── /api/reinterpret         ← Re-calls Claude in Filipino or English (no R re-run)
    ├─── /api/generate-report     ← Generates HTML report (server-side, used by pdfReport.tsx)
    ├─── /api/generate-qgis       ← Generates QGIS-ready CSV export (all 19 tests)
    ├─── /api/history             ← Returns past analyses from Supabase (includes plan_json)
    ├─── /api/usage               ← Returns usage count for current user
    ├─── /api/share               ← Creates shareable analysis token + snapshot
    ├─── /api/templates           ← GET/POST/DELETE analysis templates
    ├─── /api/notify-analysis     ← Sends analysis-complete email via Yahoo SMTP
    └─── /api/admin/*             ← Admin-only endpoints (users, usage, upgrade)
         │
         ├──────────────────────────────────────┐
         ▼                                      ▼
Anthropic API (Claude)              Render.com (R Plumber API)
- Test selection                    - Executes R scripts
- R code generation                 - Returns raw R output
- Output interpretation             - Docker container
- Language: english | filipino
         │                                      │
         └──────────────────────────────────────┘
                          │
                          ▼
               Supabase (PostgreSQL + Storage)
               - auth.users
               - public.users
               - public.usage_tracking
               - public.analysis_history (+ plan_json JSONB)
               - public.rate_limits
               - public.shared_analyses (token-gated snapshots)
               - public.analysis_templates (per-user reusable questions)
               - storage: datasets bucket
```

## Technology Stack
| Layer | Technology | Version | Host |
|---|---|---|---|
| Frontend framework | Next.js | 14.2.5 | Vercel |
| Language | TypeScript | — | — |
| Styling | Tailwind CSS + inline styles | — | — |
| Auth | Supabase Auth (@supabase/ssr) | — | Supabase |
| Database | PostgreSQL | — | Supabase |
| File storage | Supabase Storage | — | Supabase |
| AI model | Claude (Anthropic API) | claude-sonnet-4-6 | Anthropic |
| Statistical engine | R | 4.4.1 | Render.com |
| R API framework | Plumber | — | Render.com |
| R containerization | Docker | rocker/r-ver:4.4.1 | Render.com |
| PDF generation | @react-pdf/renderer | ^3.4.4 | Client-side |
| Email SMTP | nodemailer + Yahoo Mail | smtp.mail.yahoo.com:465 | Yahoo |
| Keep-alive | UptimeRobot | — | Cloud |

## Data Flow: File Upload → R Execution
1. User uploads Excel → `/api/upload`
2. File saved to Supabase Storage → background warm-up ping to Render
3. User submits research question → `/api/analyze`
4. AI selects test + generates R script
5. **NEW:** Assumption check panel shown — user reviews and approves
6. User clicks Proceed → `/api/execute-r`
7. Fresh signed URL injected into R script via `download.file()`
8. R script sent to Render → R executes → raw output returned
9. AI interprets output → saved to `analysis_history` with `plan_json`
10. Optional: email notification sent via `/api/notify-analysis`

## Language Toggle Flow (new)
1. User clicks 🇵🇭 Filipino on Interpretation tab
2. Frontend calls `/api/reinterpret` with `language: 'filipino'`
3. Claude re-interprets same R output in Filipino
4. Result shown in place — R is never re-run

## Share Link Flow (new, ADR-0003)
1. User clicks 🔗 Share on completed analysis
2. `/api/share` generates 32-char token, stores snapshot in `shared_analyses`
3. Link copied to clipboard: `/share/[token]`
4. Recipient opens link → if not logged in, sees login gate with "Create free account" CTA
5. Once logged in, sees full read-only analysis (all tabs, all downloads except share)

## Critical Constraints
- Vercel serverless functions do NOT share `/tmp` between invocations
- Render.com free tier sleeps — UptimeRobot pings every 5 minutes + warm-up on upload
- Supabase Pro tier (upgraded from free)
- Vercel Hobby tier — max function size 50MB (rules out Puppeteer; use @react-pdf/renderer)
- PDF generation is client-side only (no server-side PDF route needed)

## Dependencies
- `03_Database/SCHEMA.md`
- `04_API/API_ROUTES.md`
- `06_R_Engine/R_PACKAGES.md`
- `09_DevOps/DEPLOYMENT.md`

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added reinterpret, share, templates, notify-analysis routes; PDF is client-side; assumption check step; Supabase Pro |
