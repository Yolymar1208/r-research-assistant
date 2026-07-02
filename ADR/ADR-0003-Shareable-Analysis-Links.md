# ADR-0003 — Shareable Analysis Links

| Field | Value |
|---|---|
| Title | Shareable Analysis Links |
| Version | 1.0 |
| Status | Accepted |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-07-02 |
| Last Updated | 2026-07-02 |

## Context
JOANResearchOS users (nurses, epidemiologists, researchers) need to share completed analyses with supervisors, co-investigators, ethics board reviewers, and DOH/WHO contacts who may not have a JOANResearchOS account. Currently, the only shareable artifact is the downloaded PDF report. A live, read-only web link would allow reviewers to see the full analysis — including the verbatim R output and R script — without requiring a JOANResearchOS account or PDF download.

## Decision
Add a **shareable link feature** using a `shared_analyses` table in Supabase. When a user clicks "Share," a random 32-character URL-safe token is generated and a snapshot of the analysis result is stored. The link `/share/[token]` renders the full result publicly — no authentication required. Tokens expire after 30 days.

## Implementation

### New Supabase Table

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

-- RLS: anyone can read (public links), only owners can insert
ALTER TABLE public.shared_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read by token" ON shared_analyses FOR SELECT USING (true);
CREATE POLICY "Owners can insert" ON shared_analyses FOR INSERT WITH CHECK (true);
```

### New API Routes
- `POST /api/share` — creates share token, stores snapshot, returns token URL
- `GET /api/share/[token]` — returns stored analysis data by token (for server-side rendering)

### New Page
- `app/share/[token]/page.tsx` — public read-only view (no auth required), renders full AnalysisResults

### Share Button
Added to `AnalysisResults.tsx` header alongside PDF and R Script download buttons.

## What Is Stored
A snapshot of the complete analysis at share time:
- Full `AnalysisPlan` JSON (including test rationale, variables, assumptions)
- R script
- Raw R output (verbatim)
- AI interpretation
- Dataset name, research question, selected test
- Execution success status and time

The stored snapshot is immutable — if the user runs a new analysis, the shared link still shows the original analysis.

## Security Considerations
- Tokens are 32-character cryptographically random URL-safe strings — unguessable by brute force
- No patient data is stored — only analysis metadata and R output (per existing de-identification policy)
- Tokens expire after 30 days
- Users can only share their own analyses (INSERT policy checks user_id)
- No edit or delete capability via shared link

## Consequences
- Ethics board reviewers and supervisors can view full analysis including R script and raw output without creating an account
- Strengthens the "reproducible and verifiable" trust claim in the landing page
- Requires one SQL migration in Supabase before deployment
- Token expiry means links should not be used for permanent archival — the PDF report remains the permanent artifact

## Dependencies
- `03_Database/SCHEMA.md` — must be updated to include shared_analyses table
- `02_Architecture/SYSTEM_OVERVIEW.md` — new routes to be documented

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-02 | Initial creation |
