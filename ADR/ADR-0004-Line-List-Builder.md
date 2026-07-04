# ADR-0004 — Line List Builder: Client-Side Data Cleaning and De-identification

| Field | Value |
|---|---|
| Title | Line List Builder: Client-Side Data Cleaning and De-identification |
| Version | 1.0 |
| Status | Accepted |
| Owner | Yolymar P. Orfiano, RN, MAN |
| Created | 2026-07-04 |
| Last Updated | 2026-07-04 |

## Context

JOANResearchOS currently accepts only clean, de-identified Excel files as input. In practice, Philippine epidemiologists and researchers receive raw data from multiple sources — KoboToolbox, Google Forms, PIDSR (Philippine Integrated Disease Surveillance and Response), ODK, REDCap, hospital EMR systems, and manual Excel entry from paper CIF (Case Investigation Form) forms. These raw exports require significant data cleaning before they are suitable for statistical analysis:

- System-generated metadata columns (KoboToolbox's `_uuid`, `_submission_time`; Google Forms' `Timestamp`, `Email Address`; REDCap's `ResponseId`, `IPAddress`)
- Inconsistent value encoding (Male/male/M/MALE; 2026-05-01 vs 05/01/2026)
- Mixed PHI (Protected Health Information) and analysis data in the same file
- Column names that do not conform to WHO/DOH line list standards
- Multi-choice questions encoded as multiple binary columns (KoboToolbox/ODK)
- Test/dummy submissions mixed in with real case records

Currently, epidemiologists perform this cleaning manually in R — recreating the same cleaning script for every outbreak. JOANResearchOS has no workflow to assist with this step.

## The HIPAA / RA 10173 Problem

A naïve implementation would upload the raw file — including PHI — to Vercel/Supabase for server-side cleaning. This creates significant legal exposure:

- Raw DOH CIF data contains: full name, exact birthday, address, PhilHealth number, passport number, phone, email
- Uploading PHI to Vercel requires a signed Business Associate Agreement (BAA) with Vercel, Supabase, Anthropic (Claude API), and Render.com
- Anthropic's current enterprise terms for BAAs are not available on standard API accounts
- Vercel Secure Compute (network isolation for HIPAA) is Enterprise-only and incompatible with the Hobby tier

This rules out any architecture where raw data touches the server.

## Decision

**All data cleaning and de-identification happens client-side (in the browser) before any data leaves the user's device.**

Specifically:

1. The raw file is read and processed entirely in the browser using JavaScript (`xlsx`, `papaparse`, and purpose-built cleaning utilities)
2. **AI (Claude) receives only column names and value distributions** — never actual patient records or raw row data
3. The de-identification step must be explicitly completed and confirmed by the user before any upload is permitted
4. Only the cleaned, de-identified file is uploaded to Supabase Storage
5. The cleaned file then enters the existing JOANResearchOS analysis pipeline unchanged

This architecture means PHI never touches any server — not Vercel, not Supabase, not Anthropic, not Render. JOANResearchOS remains outside HIPAA scope for data handling, and the existing de-identification policy in the Privacy Policy and Terms of Service is enforced at the technical level rather than relying solely on user compliance.

---

## Implementation

### New Page
`app/clean/page.tsx` — the Line List Builder, a 4-step flow:

**Step 1 — Upload**
User uploads raw file. Source is detected automatically from column name patterns. User can correct the detected source from a dropdown.

**Step 2 — De-identify**
Two-column drag-and-drop UI showing PHI columns (auto-detected, pre-sorted to REMOVE) and analysis columns (pre-sorted to KEEP). User reviews and approves. A required checkbox ("I confirm these columns contain no directly identifying information") must be ticked before proceeding. This is the active legal acknowledgment that strengthens the de-identification policy.

**Step 3 — Clean**
AI-proposed cleaning steps, each requiring user Accept/Skip/Edit. Steps include: metadata column removal, value standardization, date format normalization, test submission removal, column renaming to WHO standard, and multi-choice column merging. All steps execute in the browser via JavaScript.

**Step 4 — Preview & Export**
Clean file preview (first 5 rows). Two options: download as `.xlsx`, or pass directly to the JOANResearchOS analysis pipeline (no re-upload needed).

### Source Detection (`app/lib/sourceDetector.ts`)
Client-side pattern matching on column names:

| Source | Signature Columns |
|---|---|
| KoboToolbox / ODK | `_uuid`, `_submission_time`, `_submitted_by`, `_validation_status` |
| Google Forms | `Timestamp`, `Email Address`, columns starting with question text |
| REDCap | `ResponseId`, `StartDate`, `EndDate`, `Status`, `IPAddress`, `Progress` |
| PIDSR | `PIDSR_code`, `DRU_name`, `epi_week`, `morbidity_week` |
| Hospital EMR / HEIS | `PatientID`, `AdmissionDate`, `DischargeDate`, `ICD_code` |
| Generic / Manual Excel | No recognizable pattern — skip pre-cleaning, go to AI analysis |

### PHI Detection (`app/lib/phiDetector.ts`)
Client-side pattern matching on column names to classify as PHI or analysis data:

**PHI patterns (auto-sorted to REMOVE):**
`name`, `last_name`, `first_name`, `middle_name`, `birthday`, `birth_date`, `dob`, `address`, `street`, `house`, `phone`, `cellphone`, `mobile`, `email`, `philhealth`, `sss`, `tin`, `passport`, `national_id`, `fingerprint`, `photo`, `signature`

**Safe patterns (auto-sorted to KEEP):**
`age`, `sex`, `gender`, `barangay`, `municipality`, `city`, `province`, `region`, `date_onset`, `date_consult`, `date_admit`, `date_discharge`, `case_id`, `epi_week`, `case_classification`, `outcome`, `vaccination`, `comorbidity`, `symptom`, `lab`, `result`, `exposure`

**Special handling:**
- `birthday` / `birth_date` → offer "Convert to age" (compute age from birthday, remove birthday)
- GPS columns → offer "Keep barangay only" (remove lat/lng/altitude/precision)
- Free-text columns with high cardinality → flag as potential indirect identifier

### AI Integration
Claude receives only:
```json
{
  "source": "KoboToolbox",
  "columnCount": 47,
  "rowCount": 312,
  "keepColumns": [
    { "name": "q3_sex_of_patient", "type": "character", "uniqueValues": ["male", "Male", "M", "MALE", "female", "Female", "F"], "sampleCount": 312 },
    { "name": "q1_date_of_symptom_onset", "type": "mixed", "sampleValues": ["2026-05-01", "05/02/2026", "May 3 2026"], "missingCount": 4 }
  ]
}
```

Claude never receives row-level data. Claude proposes:
1. Column renames (to WHO line list standard)
2. Value recoding rules (male/Male/M/MALE → Male)
3. Date format standardization
4. Multi-choice column merger rules

All proposals are reviewed and approved by the user before execution.

### WHO Line List Standard Column Mapping
Target columns for all DOH/Philippine outbreak line lists:

```
case_id, date_onset, date_consult, date_admit, date_discharge,
date_report, epi_week, age, sex, civil_status, barangay,
municipality, province, region, case_classification,
symptoms, comorbidities, vaccination_status, exposure_history,
lab_specimen, lab_result, outcome, date_outcome, reporting_dru
```

PIDSR-specific additional columns:
```
pidsr_code, morbidity_week, disease, reporting_facility, icd_code
```

### New Files
```
app/clean/page.tsx                ← Line List Builder (4-step flow)
app/lib/sourceDetector.ts         ← Client-side source detection
app/lib/phiDetector.ts            ← Client-side PHI column classification
app/lib/lineListCleaner.ts        ← Client-side cleaning operations
app/api/suggest-cleaning/route.ts ← AI cleaning suggestions (column names only, no row data)
```

### No New Database Tables Required
The Line List Builder produces a file. It does not persist anything to Supabase. The cleaned output file enters the existing upload → analyze pipeline and is stored in the existing `datasets` Supabase Storage bucket.

---

## Consequences

### Positive
- PHI never leaves the user's device — HIPAA/RA 10173 exposure is eliminated by architecture, not just policy
- Works offline for the cleaning step (only AI suggestions require internet)
- Supports all major Philippine epidemiological data sources (KoboToolbox, PIDSR, Google Forms, ODK, REDCap, Hospital EMR)
- Eliminates the manual R cleaning script that epidemiologists currently write for every outbreak
- Directly competitive with a core pain point for RESU/ESU teams across all Philippine regions
- "Compatible with PIDSR" is a strong institutional sales signal for DOH procurement
- The active de-identification confirmation strengthens legal protection beyond the existing Terms of Service clause

### Negative / Constraints
- All cleaning logic must be JavaScript (no R during cleaning phase) — complex statistical operations are not available
- Browser performance on very large datasets (>10,000 rows) may be slow on older devices (2014 MacBook Air)
- AI suggestions require an active internet connection and consume Anthropic API tokens (Haiku 4.5, minimal cost since only column metadata is sent)
- No server-side audit log of what cleaning steps were applied (this is intentional — logging would require receiving the data)

### Mitigations
- Large dataset performance: process in chunks using JavaScript `setTimeout` to avoid blocking the UI thread
- AI cost: use Haiku 4.5 for cleaning suggestions (column metadata is tiny — estimated $0.001 per cleaning session)
- Audit trail: the cleaned file itself is the audit trail — it can be downloaded and compared to the original

---

## Alternatives Considered

### Alternative A — Server-Side Cleaning with BAA
Upload raw file to server, clean server-side using R.
**Rejected:** Requires BAAs with Vercel, Supabase, Anthropic, and Render. Anthropic BAA not available on standard API. Vercel Secure Compute is Enterprise-only.

### Alternative B — Separate HIPAA-Compliant App
Build a completely separate application with proper HIPAA infrastructure for data cleaning.
**Rejected:** Premature at current stage. Adds significant infrastructure cost and operational complexity. The client-side approach achieves the same privacy outcome at zero additional infrastructure cost.

### Alternative C — Downloadable R Script Generator
AI generates a cleaning R script that the user runs locally.
**Rejected:** Requires the user to have R installed. Adds friction. Doesn't help non-R users. Partially useful as a secondary export option (can still offer "Download as R script" alongside the browser-based cleaning).

---

## Dependencies
- `02_Architecture/SYSTEM_OVERVIEW.md` — update to include /clean page and suggest-cleaning route
- `03_Database/SCHEMA.md` — no changes needed (no new tables)
- `07_Frontend/FRONTEND_ARCHITECTURE.md` — update to include new files
- `ADR/ADR-0001-R-is-the-Statistical-Engine.md` — R is still the only statistical engine; data cleaning is pre-analysis and uses JavaScript, not R

## Revision History
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-04 | Initial creation |
EOF
echo "done"