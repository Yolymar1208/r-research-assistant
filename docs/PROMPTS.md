# JOANResearchOS — AI Prompts Architecture

| Field | Value |
|---|---|
| Title | AI Prompts Architecture |
| Version | 2.0 |
| Status | Active |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-07-02 |

## Purpose
Documents how Claude is used in JOANResearchOS.

## What Claude Does (Allowed)
1. **Test selection** — reads dataset summary + research question → selects correct test
2. **R code generation** — writes the R script executed on Render
3. **Output interpretation** — reads raw R output → writes plain language interpretation
4. **Language switching** — re-interprets same R output in Filipino when requested

## What Claude Must NEVER Do
- Compute, estimate, or generate any statistical value
- Invent numbers not present in the R output
- Use any model other than `claude-sonnet-4-6`

---

## Prompt 1: Analysis Planner (`buildAnalysisPlannerPrompt`)
**Called by:** `app/lib/aiService.ts → createAnalysisPlan()`
**Output:** Raw JSON, 10 keys, no markdown

```json
{
  "researchQuestion": "...",
  "hypothesis": "...",
  "dependentVariable": "exact R column name or null",
  "independentVariable": "exact R column name or null",
  "additionalVariables": [],
  "selectedTest": "one of the 19 test keys",
  "testRationale": "one sentence",
  "assumptions": ["assumption 1", "assumption 2"],
  "followUpQuestions": [],
  "planSummary": "two sentences maximum"
}
```

---

## Prompt 2: R Code Generator (`buildRCodeGeneratorPrompt`)
**Called by:** `app/lib/aiService.ts → generateRScript()`
**Output:** Pure R code only

The line `file_path <- "{path}"` is replaced in `execute-r/route.ts` with a `download.file()` block using a fresh Supabase Storage signed URL.

---

## Prompt 3: Output Interpreter (`buildInterpretationPrompt`)
**Called by:** `app/lib/aiService.ts → interpretROutput(plan, rScript, rawOutput, language)`
**Output:** Markdown text

### Language Parameter (added 2026-07-02)
```typescript
interpretROutput(plan, rScript, rawOutput, language: 'english' | 'filipino' = 'english')
```

When `language = 'filipino'`:
- All section headings are in Filipino (Tagalog)
- Plain-language explanation is in Filipino
- Statistical values (numbers, p-values, CIs) are copied verbatim from R output — never translated
- Standard DOH/FETP section structure is preserved

Filipino headings (epi tests):
1. Buod ng mga Natuklasan
2. Mga Resulta ayon sa Panahon
3. Mga Resulta ayon sa Tao
4. Mga Resulta ayon sa Lugar
5. Mga Istatistikal na Resulta
6. Mga Rekomendasyon
7. Mga Limitasyon

Filipino headings (standard tests):
1. Buod ng mga Natuklasan
2. Mga Istatistikal na Resulta
3. Klinikal/Praktikal na Interpretasyon
4. Pagsusuri ng mga Pagpapalagay
5. Mga Limitasyon at Susunod na Hakbang

### Interpretation Format by Test Type
| Test Category | Sections |
|---|---|
| Parametric, Non-Parametric, Regression | 5 sections |
| Epidemiology-specific | 7 sections (WHO/FETP/DOH Time-Person-Place format) |

---

## Model Configuration
```typescript
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS_PLAN = 1024
const MAX_TOKENS_RSCRIPT = 4096
const MAX_TOKENS_INTERPRETATION = 2048
```

## Reinterpretation Route (new)
`POST /api/reinterpret` — called when user toggles language on the Interpretation tab.
- Takes: `plan`, `rScript`, `rawOutput`, `language`
- Calls `interpretROutput()` with the new language
- Returns new interpretation text
- R is NEVER re-run — only Claude is called again
- Does NOT consume an analysis credit

## Dependencies
- `06_R_Engine/STATISTICAL_TESTS.md`
- `ADR/ADR-0001-R-is-the-Statistical-Engine.md`

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
| 2.0 | 2026-07-02 | Added language parameter, Filipino interpretation, reinterpret route |
