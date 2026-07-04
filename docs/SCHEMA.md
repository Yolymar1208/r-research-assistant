# JOANResearchOS — Database Schema

| Field | Value |
|---|---|
| Title | Database Schema |
| Version | 3.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-05 |

## Purpose
Documents every table, column, constraint, and RLS policy in the JOANResearchOS Supabase database.

## Database: Supabase Pro (PostgreSQL)

---

## Table: public.users
Stores user profile and subscription plan.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  analyses_limit INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Plans:**
| Plan | Price | analyses_limit | Members |
|---|---|---|---|
| free | ₱0/month | 3 | 1 |
| researcher | ₱1,499/month | 999999 | 1 |
| team | ₱3,499/month | 999999 | up to 5 |
| institution | ₱8,999/month | 999999 | up to 20 |

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
  plan_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** `plan_json` stores the full `AnalysisPlan` object. Rows before 2026-07-02 have `plan_json = NULL`.

---

## Table: public.shared_analyses
Stores snapshots for shareable links (ADR-0003). Requires login to view.

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
CREATE POLICY "Authenticated read by token" ON shared_analyses
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners can insert" ON shared_analyses FOR INSERT WITH CHECK (true);
```

---

## Table: public.analysis_templates
Reusable research question templates per user.

```sql
CREATE TABLE public.analysis_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, research_question TEXT NOT NULL,
  hypothesis TEXT DEFAULT '', selected_test TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.analysis_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON analysis_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## Table: public.teams
Team workspaces for Team and Institution plan subscribers.

```sql
CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'team',
  max_members INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team owners can manage their team" ON teams
  FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Team members can view their team" ON teams
  FOR SELECT USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
```

---

## Table: public.team_members
Links users to teams. Team members get unlimited analyses regardless of their individual plan.

```sql
CREATE TABLE public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view membership" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Team owners can manage members" ON team_members
  FOR ALL USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()));
```

**Status values:** `active` (full access), `pending` (invited but not yet signed up)
**Role values:** `owner`, `member`

---

## Table: public.rate_limits
```sql
CREATE TABLE public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rate_limits_key_time ON rate_limits(key, created_at);
```

---

## Storage: datasets bucket
- Bucket: `datasets` (private)
- Signed URL expiry: 3600 seconds
- Path: `{user_id}/{sessionId}.{ext}`

---

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added shared_analyses, analysis_templates, plan_json |
| 3.0 | 2026-07-05 | Added teams, team_members; updated plans/pricing |
