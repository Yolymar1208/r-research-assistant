# R Research Assistant — v0.1 Prototype

A statistical analysis platform where **R is the engine and AI is the assistant**.

> AI generates code. R computes all statistical results. Nothing is fabricated.

---

## Philosophy

| Role | Responsibility |
|------|----------------|
| **AI (Claude)** | Understands the research question, selects the correct test, generates clean R code, interprets R output |
| **R** | Performs ALL statistical calculations — means, SDs, p-values, CIs, effect sizes |

AI never computes or estimates any statistical value. Every number in the output comes from R.

---

## Supported Analyses (v0.1)

- Descriptive Statistics
- Independent Samples t-test
- Paired t-test
- One-Way ANOVA
- Chi-Square Test
- Pearson Correlation

---

## Prerequisites

### 1. Node.js
- Version 18 or higher
- Download: https://nodejs.org

### 2. R
- Version 4.0 or higher
- Download: https://cran.r-project.org

### 3. R Packages
After installing R, open a terminal and run:

```bash
Rscript r/install_packages.R
```

This installs: `readxl`, `dplyr`, `tidyr`, `ggplot2`, `gtsummary`, `janitor`, `car`, `effectsize`, `psych`

### 4. Anthropic API Key
- Get one at: https://console.anthropic.com
- You need a Claude API key (not a Claude.ai subscription)

---

## Setup

### Step 1: Install dependencies

```bash
npm install
```

### Step 2: Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

### Step 3: (Optional) Verify R is accessible

```bash
Rscript --version
```

Expected output: `R scripting front-end version 4.x.x ...`

If this fails, see **Troubleshooting** below.

### Step 4: Start the application

```bash
npm run dev
```

Open http://localhost:3000

---

## Usage

1. **Upload Excel** — drag and drop or click to browse (.xlsx or .xls)
2. **Review dataset inspection** — columns, types, missing values are shown immediately
3. **Enter research question** — describe what you want to find out in plain language
4. **Click Generate Analysis**
5. **Review results** — four tabs: Analysis Plan · R Script · Raw R Output · AI Interpretation
6. **Download analysis.R** — the exact script R executed, for your records

---

## Create a Test Dataset

If you don't have data yet, generate a sample clinical dataset:

```bash
# First install writexl if needed
Rscript -e "install.packages('writexl')"

# Generate sample data
Rscript r/create_sample_data.R
```

This creates `sample_dataset.xlsx` — a simulated study comparing pain scores between spinal and general anesthesia.

Suggested research question:
> "Is there a significant difference in 2-hour pain scores between patients who received spinal anesthesia versus general anesthesia?"

---

## Project Structure

```
r-research-assistant/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # Receives Excel, returns dataset summary
│   │   ├── analyze/route.ts         # AI creates plan + R script
│   │   └── execute-r/route.ts       # Runs Rscript, AI interprets output
│   ├── components/
│   │   ├── DatasetSummaryPanel.tsx  # Shows columns, types, preview
│   │   ├── StatusIndicator.tsx      # Pipeline status steps
│   │   └── AnalysisResults.tsx      # Tabbed results view
│   ├── lib/
│   │   ├── datasetInspector.ts      # Reads Excel, detects types
│   │   ├── rExecutor.ts             # Runs Rscript subprocess
│   │   ├── prompts.ts               # AI system prompts
│   │   └── aiService.ts             # Anthropic API calls
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript types
│   ├── layout.tsx
│   ├── page.tsx                     # Main UI
│   └── globals.css
├── r/
│   ├── install_packages.R           # One-time package installer
│   └── create_sample_data.R        # Sample dataset generator
├── .env.local.example
├── package.json
└── README.md
```

---

## Troubleshooting

### "Rscript not found"

The app searches common installation paths. If R is installed in a non-standard location, add this to `.env.local`:

```
# macOS (Apple Silicon)
R_EXECUTABLE_PATH=/opt/homebrew/bin/Rscript

# macOS (Intel)
R_EXECUTABLE_PATH=/usr/local/bin/Rscript

# Linux
R_EXECUTABLE_PATH=/usr/bin/Rscript

# Windows
R_EXECUTABLE_PATH=C:\Program Files\R\R-4.4.0\bin\Rscript.exe
```

### "Package not found" error from R

Run the package installer again:
```bash
Rscript r/install_packages.R
```

### "ANTHROPIC_API_KEY is not set"

Make sure you created `.env.local` (not `.env`) with your API key. Restart `npm run dev` after editing it.

### R script runs but produces unexpected results

Check the **R Script** tab to see exactly what code was generated, and the **Raw R Output** tab to see R's exact output. This is the transparency guarantee of the system.

---

## Workflow Diagram

```
User uploads Excel
       ↓
App inspects dataset (column names, types, missing values)
       ↓
User enters research question
       ↓
AI reads metadata → selects statistical test → generates R script
       ↓
App runs: Rscript analysis.R
       ↓
App captures raw R console output
       ↓
AI reads R output → writes plain-language interpretation
       ↓
User sees: Plan · R Script · Raw Output · Interpretation
       ↓
User downloads analysis.R
```

---

## Design Principles

- **Reproducibility**: Every analysis produces a downloadable `.R` file that can be re-run independently
- **Transparency**: Raw R output is always visible — nothing is hidden or reformatted
- **Trust**: Statistical values come exclusively from R, never from AI
- **Simplicity**: No database, no auth, no cloud — runs locally in minutes

---

## Roadmap (Not in v0.1)

- Authentication & user accounts
- Analysis history / project management
- Additional tests: regression, ANOVA factorial, survival analysis
- Quarto report generation
- Docker deployment
- Cloud storage for datasets

---

## License

Prototype — internal use only.
