# ADR-0001 — R is the Only Statistical Engine

| Field | Value |
|---|---|
| Title | R is the Only Statistical Engine |
| Version | 1.0 |
| Status | Accepted |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-06-30 |
| Last Updated | 2026-06-30 |

## Context
JOANResearchOS is a statistical analysis platform used by nurses, physicians, epidemiologists, and researchers in the Philippines. Users submit analysis results to DOH outbreak investigation reports, WHO surveillance systems, university ethics boards, and peer-reviewed journals. These submissions require traceable, reproducible, and verifiable statistical computations.

Large Language Models (LLMs) including Claude can generate plausible-looking statistical values (p-values, confidence intervals, risk ratios) through pattern completion. These values may appear correct but are not computed from the actual data. Submitting AI-generated statistical values to a DOH report or ethics board is scientific misconduct.

## Decision
**R is the only engine permitted to compute statistical values in JOANResearchOS.**

This means:
- All p-values come from R
- All confidence intervals come from R
- All risk ratios, odds ratios, attributable risks come from R
- All effect sizes (Cohen's d, Cramér's V, rank-biserial) come from R
- All survival probabilities and CFRs come from R
- All attack rates and weekly case counts come from R
- All regression coefficients and standard errors come from R

Claude (AI) is permitted to:
- Read the dataset column summary and select the appropriate statistical test
- Write the R code that will perform the computation
- Read the verbatim R console output and write a plain-language interpretation

Claude is strictly forbidden from:
- Computing or estimating any statistical value
- Inventing numbers not present in the R output
- Paraphrasing statistical values in a way that changes their meaning

## Consequences
- Every analysis includes the complete R script (downloadable as `analysis.R`)
- Every analysis includes the verbatim R console output (visible in Raw R Output tab)
- Any biostatistician can independently re-run the R script and verify results
- PDF reports are reproducible and audit-ready for DOH and ethics boards
- QGIS CSV exports contain only values computed by R, never by AI

## Enforcement
The interpretation prompt in `app/lib/prompts.ts` explicitly instructs Claude:
> "Base interpretation ENTIRELY on the R output below — never fabricate or estimate values. If a value is not in the R output, state it was not computed — do not invent it."

Any AI working on JOANResearchOS that suggests computing statistical values in JavaScript, TypeScript, or AI prompts must be corrected to route those computations through R instead.

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial creation |
