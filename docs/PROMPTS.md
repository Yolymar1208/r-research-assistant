# JOANResearchOS — AI Prompts Architecture

| Field | Value |
|---|---|
| Title | AI Prompts Architecture |
| Version | 3.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-05 |

## What Claude Does (Allowed)
1. Test selection — reads dataset + question → selects correct test
2. R code generation — writes R script executed on Render
3. Output interpretation — reads R output → writes plain-language interpretation WITH source tags
4. Research question suggestions — reads column profiles → suggests 4-5 questions (Haiku)
5. Cleaning suggestions — reads column names + value distributions → suggests cleaning steps (Haiku, Line List Builder)
6. Citation search — searches web for supporting literature after analysis (Haiku + web_search)

## What Claude Must NEVER Do
- Compute or estimate any statistical value
- Invent numbers not in R output
- Use any model other than claude-haiku-4-5-20251001 or claude-sonnet-4-6
- Fabricate citations or URLs not from actual search results
- Receive row-level data in the Line List Builder cleaning flow

---

## Model Routing
| Call | Model | Purpose | Approx cost |
|---|---|---|---|
| Analysis planning | claude-haiku-4-5-20251001 | Test selection + plan JSON | ~$0.003 |
| R code generation | claude-haiku-4-5-20251001 | R script | ~$0.005 |
| Interpretation | claude-sonnet-4-6 | Plain-language report | ~$0.010 |
| Suggest questions | claude-haiku-4-5-20251001 | 4-5 research questions | ~$0.002 |
| Suggest cleaning | claude-haiku-4-5-20251001 | Line List Builder steps | ~$0.001 |
| Find citations | claude-haiku-4-5-20251001 + web_search | 2-3 live references | ~$0.003–0.005 |

Prompt caching (`cache_control: { type: 'ephemeral' }`) applied on static instruction blocks of all calls.

---

## Prompt 1: Analysis Planner
**Function:** `createAnalysisPlan()` in `aiService.ts`
**Split marker for caching:** `DATASET PROFILE:`
**Output:** Raw JSON, 10 keys

## Prompt 2: R Code Generator
**Function:** `generateRScript()` in `aiService.ts`
**Split marker for caching:** `FILE PATH:`
**Output:** Pure R code

## Prompt 3: Output Interpreter
**Function:** `interpretROutput(plan, rScript, rawOutput)` in `aiService.ts`
**Split marker for caching:** `RESEARCH QUESTION:`
**Note:** Language parameter REMOVED — always English only (Filipino removed for cost reduction)

### Source Tagging (added 2026-07-05)
Claude is instructed to tag every interpretive claim with an inline source badge:

| Tag | Meaning | Rendered color |
|---|---|---|
| `[R]` | Value computed by R | Green |
| `[WHO]` | WHO guideline or threshold | Blue |
| `[CDC]` | CDC/FETP standard | Red |
| `[EpiR]` | EpiR Handbook guidance | Violet |
| `[DOH]` | Philippine DOH/PIDSR standard | Gold |
| `[stat]` | General statistical convention | Gray |

Example output:
```
The attack rate among exposed individuals was 45.2% [R], compared to 12.1% [R]
among unexposed (p=0.003 [R]). A p-value below alpha of 0.05 [stat] indicates
statistical significance. Risk ratio of 2.4 [R] exceeds 1.0, indicating elevated
risk [WHO] among the exposed group.
```

These are rendered as colored inline badges by `renderTaggedText()` in `AnalysisResults.tsx`.

## Prompt 4: Research Question Suggester
**Route:** `POST /api/suggest-questions`
**Input:** Dataset column profiles (names, types, sample values) — no row data
**Output:** JSON array of 4-5 research question strings
**Cost:** ~$0.002 per click (user-initiated only)

## Prompt 5: Cleaning Suggester (Line List Builder)
**Route:** `POST /api/suggest-cleaning`
**Input:** Column names + value distributions ONLY — never row data (PHI safety)
**Output:** JSON array of AISuggestion objects
**Cost:** ~$0.001 per cleaning session

## Prompt 6: Citation Finder
**Route:** `POST /api/find-citations`
**Tool:** `web_search_20250305`
**Input:** Plan + key findings (3 sentences) + R output snippet (500 chars)
**Output:** JSON array of 0-3 LiveCitation objects with real URLs from search
**Critical:** Never fabricate citations. Return empty array if no good results found.
**Cost:** ~$0.003–0.005 per analysis

## Removed Prompts
- Filipino interpretation (reinterpret) — REMOVED 2026-07-05 for cost reduction

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added language parameter, Filipino interpretation |
| 3.0 | 2026-07-05 | Removed Filipino; added source tagging, suggest-questions, suggest-cleaning, find-citations |
