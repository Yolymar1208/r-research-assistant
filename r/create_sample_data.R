# create_sample_data.R
# Creates a sample Excel dataset for testing the R Research Assistant.
# Simulates a clinical study comparing pain scores between anesthesia types.
#
# Usage:
#   Rscript create_sample_data.R

library(writexl)

set.seed(42)
n <- 60

data <- data.frame(
  Patient_ID        = 1:n,
  Age               = round(rnorm(n, mean = 45, sd = 12)),
  Gender            = sample(c("Male", "Female"), n, replace = TRUE, prob = c(0.45, 0.55)),
  Anesthesia_Type   = sample(c("Spinal", "General"), n, replace = TRUE),
  ASA_Class         = sample(c("I", "II", "III"), n, replace = TRUE, prob = c(0.3, 0.5, 0.2)),
  Surgery_Duration_Min = round(rnorm(n, mean = 90, sd = 25)),
  Pain_Score_0h     = round(runif(n, 0, 3)),
  Pain_Score_2h     = NA,
  Pain_Score_6h     = NA,
  Blood_Loss_mL     = round(rnorm(n, mean = 200, sd = 80)),
  Hospital_Stay_Days = round(rnorm(n, mean = 3, sd = 1.2))
)

# Generate pain scores with realistic group differences
for (i in 1:n) {
  base <- ifelse(data$Anesthesia_Type[i] == "Spinal", 3.5, 5.5)
  data$Pain_Score_2h[i] <- max(0, min(10, round(rnorm(1, base, 1.5))))
  data$Pain_Score_6h[i] <- max(0, min(10, round(rnorm(1, base - 0.8, 1.2))))
}

# Introduce some missing values (realistic)
missing_rows <- sample(1:n, 4)
data$Blood_Loss_mL[missing_rows[1:2]] <- NA
data$Hospital_Stay_Days[missing_rows[3:4]] <- NA

write_xlsx(data, "sample_dataset.xlsx")
cat("Created sample_dataset.xlsx with", n, "rows and", ncol(data), "columns.\n")
cat("Upload this file to test the R Research Assistant.\n")
cat("\nSuggested research question:\n")
cat("  'Is there a significant difference in 2-hour pain scores between patients who\n")
cat("   received spinal anesthesia versus general anesthesia?'\n")
