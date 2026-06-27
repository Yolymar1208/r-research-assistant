# install_packages.R
# Run this script once before starting the application.
# It installs all required R packages.
#
# Usage:
#   Rscript install_packages.R

cat("Installing required R packages for R Research Assistant...\n\n")

packages <- c(
  "readxl",      # Read Excel files
  "dplyr",       # Data manipulation
  "tidyr",       # Data tidying
  "ggplot2",     # Visualizations (future use)
  "gtsummary",   # Summary tables
  "janitor",     # Clean column names
  "car",         # Levene's test, Type III ANOVA
  "effectsize",  # Cohen's d, eta squared, Cramer's V
  "psych"        # Descriptive statistics
)

installed <- rownames(installed.packages())
to_install <- packages[!packages %in% installed]

if (length(to_install) == 0) {
  cat("All packages already installed!\n")
} else {
  cat("Installing:", paste(to_install, collapse = ", "), "\n\n")
  install.packages(to_install, repos = "https://cran.rstudio.com/", dependencies = TRUE)
}

# Verify all packages load
cat("\nVerifying package loading...\n")
all_ok <- TRUE
for (pkg in packages) {
  result <- tryCatch({
    library(pkg, character.only = TRUE)
    cat(sprintf("  ✓ %s\n", pkg))
    TRUE
  }, error = function(e) {
    cat(sprintf("  ✗ %s — FAILED: %s\n", pkg, e$message))
    FALSE
  })
  if (!result) all_ok <- FALSE
}

cat("\n")
if (all_ok) {
  cat("All packages loaded successfully. You're ready to run the application.\n")
} else {
  cat("Some packages failed to load. Please check the errors above.\n")
  quit(status = 1)
}
