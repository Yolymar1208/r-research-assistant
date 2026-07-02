# JOANResearchOS — Deployment Guide

| Field | Value |
|---|---|
| Title | Deployment Guide |
| Version | 2.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-02 |

## Purpose
Documents how to deploy, update, and maintain JOANResearchOS.

---

## Frontend — Vercel

**Project:** r-research-assistant
**GitHub repo:** https://github.com/Yolymar1208/r-research-assistant
**Branch:** main
**Auto-deploy:** Yes — every push to main triggers deployment (~25–60s)
**Tier:** Hobby (50MB function size limit — no Puppeteer; use @react-pdf/renderer)

### Vercel Environment Variables (complete list)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `R_API_URL` | Render R Plumber API URL |
| `YAHOO_EMAIL` | Yahoo email for SMTP (yolymarorfiano@yahoo.com) |
| `YAHOO_APP_PASSWORD` | Yahoo app password (not regular password — generate at Yahoo Account Security) |
| `NEXT_PUBLIC_APP_URL` | Production URL (https://r-research-assistant-vx33.vercel.app) |

### Known Vercel Constraints
- Serverless functions do NOT share `/tmp` — never rely on temp file persistence
- Max request body: 4.5MB
- Max function size: 50MB — `@react-pdf/renderer` is safe; Puppeteer is not
- `import * as fs from 'fs'` at top level crashes client bundle — always use `await import('fs')`

---

## R API — Render.com

**Service:** r-plumber-api
**GitHub repo:** https://github.com/Yolymar1208/r-plumber-api
**Auto-deploy:** Yes — every push triggers Docker rebuild (~10–15 minutes)

### Keep-Alive
UptimeRobot pings `/health` every 5 minutes.
Additionally, `/api/upload` fires a background warm-up ping on every file upload so Render has extra time to wake before the user clicks Generate.

---

## Database — Supabase

**Project:** mwfsfdloprvawgzljolh
**Tier:** Pro
**Dashboard:** https://supabase.com/dashboard/project/mwfsfdloprvawgzljolh

### Email SMTP
- Provider: Yahoo Mail
- Host: smtp.mail.yahoo.com
- Port: 465
- Admin email: yolymarorfiano@yahoo.com
- Uses Yahoo **app password** (generate at Yahoo Account Security → App Passwords)

### Manual Operations

**Confirm a user's email:**
```sql
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'user@email.com';
```

**Upgrade a user's plan:**
```sql
UPDATE public.users SET plan = 'pro', analyses_limit = 999999 WHERE email = 'user@email.com';
UPDATE public.usage_tracking SET plan = 'pro' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@email.com');
```

**Add shared_analyses table (already run 2026-07-02):**
```sql
CREATE TABLE public.shared_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_name TEXT, research_question TEXT, selected_test TEXT,
  ai_interpretation TEXT, r_script TEXT, raw_output TEXT,
  execution_success BOOLEAN DEFAULT true, execution_time_ms INTEGER DEFAULT 0,
  plan JSONB, created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX idx_shared_analyses_token ON shared_analyses(token);
ALTER TABLE public.shared_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read by token" ON shared_analyses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners can insert" ON shared_analyses FOR INSERT WITH CHECK (true);
```

**Add analysis_templates table (already run 2026-07-02):**
```sql
CREATE TABLE public.analysis_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, research_question TEXT NOT NULL,
  hypothesis TEXT DEFAULT '', selected_test TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_analysis_templates_user_id ON analysis_templates(user_id);
ALTER TABLE public.analysis_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON analysis_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Add plan_json to analysis_history (already run 2026-07-02):**
```sql
ALTER TABLE public.analysis_history ADD COLUMN IF NOT EXISTS plan_json JSONB;
```

---

## Static Assets

**Sample dataset:** `public/sample-datasets/outbreak_demo.xlsx`
Served by Vercel at `/sample-datasets/outbreak_demo.xlsx`.
90-row gastroenteritis outbreak linelist with date_onset, age, sex, village, water_source_exposed, symptoms, outcome.

---

## GitHub Workflow (No CLI)
Yoly uses the GitHub web UI for all file edits and uploads. Known limitation: GitHub web UI cannot correctly create files inside folders with parentheses (e.g., `(app)` paths). Workaround: use plain API routes under `app/api/`.

## Dependencies
- `02_Architecture/SYSTEM_OVERVIEW.md`
- `03_Database/SCHEMA.md`

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added YAHOO_EMAIL/YAHOO_APP_PASSWORD/NEXT_PUBLIC_APP_URL env vars; documented SQL migrations; Supabase Pro; warm-up ping on upload; static sample dataset |
