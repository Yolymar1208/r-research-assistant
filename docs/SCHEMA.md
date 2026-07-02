# JOANResearchOS — Database Schema

| Field | Value |
|---|---|
| Title | Database Schema |
| Version | 2.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-02 |

## Purpose
Documents every table, column, constraint, trigger, and RLS policy in the JOANResearchOS Supabase database.

## Scope
All tables in the `public` schema plus Supabase Auth and Storage.

## Database: Supabase (PostgreSQL)
Project URL: https://mwfsfdloprvawgzljolh.supabase.co

---

## Table: public.users
Stores user profile and subscription plan. Created automatically when a user signs up via trigger.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  analyses_limit INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Trigger:** `on_auth_user_created` — inserts a row into `public.users` whenever a new user signs up.

**Plans:**
| Plan | Price | analyses_limit |
|---|---|---|
| free | ₱0/month | 5 |
| pro | ₱999/month | 999999 |
| institution | ₱4,999/month | 999999 |

---

## Table: public.usage_tracking
Tracks monthly analysis count per user or IP address.

```sql
CREATE TABLE public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  analyses_count INTEGER DEFAULT 0,
  month_year TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table: public.analysis_history
Stores completed analyses for the History page.

```sql
CREATE TABLE public.analysis_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  dataset_name TEXT,
  research_question TEXT,
  selected_test TEXT,
  ai_interpretation TEXT,
  r_script TEXT,
  raw_output TEXT,
  execution_success BOOLEAN DEFAULT true,
  plan_json JSONB,           -- Added 2026-07-02: full AnalysisPlan for byte-perfect PDF regeneration
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** `plan_json` stores the full `AnalysisPlan` object as JSONB. Rows before 2026-07-02 have `plan_json = NULL` and use best-effort PDF reconstruction from `selected_test` + `research_question`.

---

## Table: public.rate_limits
Tracks requests for rate limiting (max 10 per minute per user/IP).

```sql
CREATE TABLE public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_key_time ON rate_limits(key, created_at);
```

---

## Table: public.shared_analyses
Stores snapshots of completed analyses for shareable links. Added 2026-07-02 per ADR-0003.

```sql
CREATE TABLE public.shared_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_name TEXT,
  research_question TEXT,
  selected_test TEXT,
  ai_interpretation TEXT,
  r_script TEXT,
  raw_output TEXT,
  execution_success BOOLEAN DEFAULT true,
  execution_time_ms INTEGER DEFAULT 0,
  plan JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_shared_analyses_token ON shared_analyses(token);
```

**RLS:**
```sql
CREATE POLICY "Authenticated read by token" ON shared_analyses
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners can insert" ON shared_analyses
  FOR INSERT WITH CHECK (true);
```

**Token format:** 32-character URL-safe random string. Tokens expire after 30 days.

---

## Table: public.analysis_templates
Stores reusable research question templates per user. Added 2026-07-02.

```sql
CREATE TABLE public.analysis_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  research_question TEXT NOT NULL,
  hypothesis TEXT DEFAULT '',
  selected_test TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analysis_templates_user_id ON analysis_templates(user_id);
```

**RLS:**
```sql
CREATE POLICY "Users can manage own templates" ON analysis_templates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Storage: datasets bucket
Stores uploaded Excel files for R execution.

| Setting | Value |
|---|---|
| Bucket name | datasets |
| Public | false (private) |
| Signed URL expiry | 3600 seconds (1 hour) |

File path pattern: `{user_id}/{sessionId}.{ext}` or `anonymous/{sessionId}.{ext}`

---

## RLS Policies
All tables have RLS enabled. API routes use `supabaseAdmin` with service role key for full access.

---

## Admin Account
Email: yolymarorfiano@yahoo.com
Plan: institution (unlimited analyses)
Set manually via SQL or admin dashboard.

## Dependencies
- `02_Architecture/SYSTEM_OVERVIEW.md`
- `08_Security/AUTH.md`

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added shared_analyses, analysis_templates tables; added plan_json to analysis_history |
