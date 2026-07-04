# JOANResearchOS — System Architecture Overview

| Field | Value |
|---|---|
| Title | System Architecture Overview |
| Version | 3.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-05 |

## Live URLs
| Service | URL |
|---|---|
| App | https://r-research-assistant-vx33.vercel.app |
| Landing page | https://r-research-assistant-vx33.vercel.app/landing |
| Line List Builder | https://r-research-assistant-vx33.vercel.app/clean |
| Team management | https://r-research-assistant-vx33.vercel.app/team |
| Admin | https://r-research-assistant-vx33.vercel.app/admin |
| R API | https://r-plumber-api-rc95.onrender.com |

## GitHub Repositories
| Repo | URL |
|---|---|
| Frontend | https://github.com/Yolymar1208/r-research-assistant |
| R API | https://github.com/Yolymar1208/r-plumber-api |

## Complete API Route Map
```
/api/upload                ← File upload + warm-up R API ping
/api/analyze               ← AI planning + R code generation (Haiku)
/api/execute-r             ← R execution + interpretation + saves plan_json
/api/reinterpret           ← REMOVED (Filipino translation removed for cost)
/api/generate-report       ← HTML report (all 19 test labels)
/api/generate-qgis         ← QGIS CSV for all 19 tests
/api/history               ← Analysis history (includes plan_json)
/api/usage                 ← Usage status
/api/share                 ← Creates shareable analysis token (ADR-0003)
/api/templates             ← GET/POST/DELETE analysis templates
/api/notify-analysis       ← Analysis-complete email via Yahoo SMTP
/api/suggest-questions     ← AI research question suggestions (Haiku, ~$0.002)
/api/suggest-cleaning      ← AI cleaning suggestions for Line List Builder
/api/find-citations        ← Live web search for supporting literature (Haiku + web_search)
/api/team                  ← GET/POST/DELETE team management
/api/admin/users           ← Admin: list users
/api/admin/usage           ← Admin: usage stats
/api/admin/upgrade         ← Admin: upgrade user plan
```

## Cost Per Analysis (current, post-optimization)
| Call | Model | Cost |
|---|---|---|
| Call 1: Analysis planning | Haiku 4.5 | ~$0.003 |
| Call 2: R code generation | Haiku 4.5 | ~$0.005 |
| Call 3: Interpretation | Sonnet 4.6 | ~$0.010 |
| **Total per analysis** | | **~$0.018** |
| Suggest questions (on-demand) | Haiku 4.5 | ~$0.002 |
| Find citations (post-analysis) | Haiku 4.5 + web search | ~$0.003–0.005 |
| Suggest cleaning (Line List Builder) | Haiku 4.5 | ~$0.001 |

Prompt caching applied on all three analysis calls (~30–40% additional savings).
Filipino translation removed (was ~$0.002–0.004 per toggle).

## Data Flow: Analysis
```
Upload Excel → Supabase Storage → warm-up Render
→ User enters question → /api/analyze (Haiku: plan + R code)
→ Assumption check panel shown
→ User approves → /api/execute-r
  → Fresh signed URL injected into R script
  → R script sent to Render → executed
  → Sonnet interprets output (with [R][WHO][CDC][EpiR][DOH][stat] tags)
  → Saved to analysis_history with plan_json
→ Client fires /api/find-citations (Haiku + web search, async)
→ Citations appear in References tab 3–8 seconds later
```

## Data Flow: Line List Builder (/clean)
```
Upload raw file (KoboToolbox/PIDSR/Google Forms/REDCap/Hospital EMR)
→ CLIENT-SIDE: source detection (column pattern matching)
→ CLIENT-SIDE: PHI detection and column classification
→ User reviews REMOVE/KEEP buckets + ticks confirmation checkbox
→ /api/suggest-cleaning called (column metadata only — no row data)
→ AI cleaning suggestions returned
→ CLIENT-SIDE: approved steps executed in browser
→ Cleaned, de-identified file produced
→ Download as .xlsx OR pass directly to analysis pipeline
```

## Pricing (current)
| Plan | Price | Members | analyses_limit |
|---|---|---|---|
| Free | ₱0 | 1 | 3/month |
| Researcher | ₱1,499/mo | 1 | Unlimited |
| Team | ₱3,499/mo | up to 5 | Unlimited |
| Institution | ₱8,999/mo | up to 20 | Unlimited |

## Technology Stack
| Layer | Technology | Host |
|---|---|---|
| Frontend | Next.js 14.2.5 | Vercel Hobby |
| Language | TypeScript | — |
| Auth | Supabase Auth | Supabase Pro |
| Database | PostgreSQL | Supabase Pro |
| File storage | Supabase Storage | Supabase Pro |
| AI model (planning/code) | claude-haiku-4-5-20251001 | Anthropic |
| AI model (interpretation) | claude-sonnet-4-6 | Anthropic |
| Statistical engine | R 4.4.1 via Plumber | Render.com |
| PDF generation | @react-pdf/renderer | Client-side only |
| Email SMTP | nodemailer + Yahoo | smtp.mail.yahoo.com:465 |
| Keep-alive | UptimeRobot | Cloud |

## Critical Constraints
- Vercel serverless functions do NOT share /tmp
- Render.com free tier sleeps — warm-up on upload + UptimeRobot
- All Line List Builder cleaning is browser-only — PHI never reaches server
- PDF generation is client-side only — never import pdfReport.tsx on server
- Analysis is two-phase: planAnalysis() → assumption check → executeAnalysis()

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added reinterpret, share, templates, notify-analysis routes |
| 3.0 | 2026-07-05 | Added Line List Builder, find-citations, suggest-questions, team routes; removed reinterpret; updated pricing and cost model |
