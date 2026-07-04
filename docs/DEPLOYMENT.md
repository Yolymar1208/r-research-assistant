# JOANResearchOS — Deployment Guide

| Field | Value |
|---|---|
| Title | Deployment Guide |
| Version | 3.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-05 |

## Frontend — Vercel Hobby
**Repo:** github.com/Yolymar1208/r-research-assistant
**Branch:** main · Auto-deploy on push

### Complete Environment Variables
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `R_API_URL` | Render R Plumber API URL |
| `YAHOO_EMAIL` | yolymarorfiano@yahoo.com |
| `YAHOO_APP_PASSWORD` | Yahoo app password (generate at Yahoo Account Security) |
| `NEXT_PUBLIC_APP_URL` | https://r-research-assistant-vx33.vercel.app |

### Vercel Constraints
- No shared /tmp between serverless invocations
- Max request body: 4.5MB
- Max function size: 50MB (rules out Puppeteer)
- Use @react-pdf/renderer for PDF (client-side)

---

## R API — Render.com
**Repo:** github.com/Yolymar1208/r-plumber-api
**Auto-deploy:** Docker rebuild on push (~10–15 min)
**Keep-alive:** UptimeRobot pings /health every 5 min + warm-up on upload

---

## Database — Supabase Pro
**Dashboard:** https://supabase.com/dashboard/project/mwfsfdloprvawgzljolh

### All SQL Migrations Run (in order)
```sql
-- 1. plan_json column (2026-07-02)
ALTER TABLE public.analysis_history ADD COLUMN IF NOT EXISTS plan_json JSONB;

-- 2. shared_analyses table (2026-07-02)
CREATE TABLE public.shared_analyses (...);
-- See SCHEMA.md for full SQL

-- 3. analysis_templates table (2026-07-02)
CREATE TABLE public.analysis_templates (...);

-- 4. teams table (2026-07-05)
CREATE TABLE public.teams (...);

-- 5. team_members table (2026-07-05)
CREATE TABLE public.team_members (...);
```

### Admin Operations

**Upgrade user to Researcher:**
```sql
UPDATE public.users SET plan = 'researcher', analyses_limit = 999999
WHERE email = 'user@email.com';
```

**Upgrade user to Team plan (then have them create team at /team):**
```sql
UPDATE public.users SET plan = 'team', analyses_limit = 999999
WHERE email = 'owner@email.com';
```

**Upgrade user to Institution:**
```sql
UPDATE public.users SET plan = 'institution', analyses_limit = 999999
WHERE email = 'owner@email.com';
-- Then update their team max_members:
UPDATE public.teams SET max_members = 20, plan = 'institution'
WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'owner@email.com');
```

**Confirm email manually:**
```sql
UPDATE auth.users SET email_confirmed_at = NOW()
WHERE email = 'user@email.com';
```

---

## Contact / Payment
Email: yolymarorfiano@yahoo.com
Payment: GCash or bank transfer → manually upgrade in Supabase SQL editor

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added YAHOO env vars, SQL migrations |
| 3.0 | 2026-07-05 | Added teams/team_members migrations, Institution upgrade SQL, complete env var list |
