// Server-side only — never import in client components.
// Uses Yahoo Mail SMTP with nodemailer.
// Requires these environment variables in Vercel:
//   YAHOO_EMAIL   — your Yahoo email address (yolymarorfiano@yahoo.com)
//   YAHOO_APP_PASSWORD — Yahoo app password (not regular password)

import nodemailer from 'nodemailer'

const TEST_LABELS: Record<string, string> = {
  descriptive_statistics: 'Descriptive Statistics',
  independent_t_test: 'Independent Samples t-test',
  paired_t_test: 'Paired t-test',
  one_way_anova: 'One-Way ANOVA',
  chi_square: 'Chi-Square Test',
  pearson_correlation: 'Pearson Correlation',
  mann_whitney: 'Mann-Whitney U Test',
  wilcoxon_signed_rank: 'Wilcoxon Signed-Rank Test',
  kruskal_wallis: 'Kruskal-Wallis Test',
  spearman_correlation: 'Spearman Rank Correlation',
  fishers_exact: "Fisher's Exact Test",
  mcnemar: "McNemar's Test",
  logistic_regression: 'Logistic Regression',
  linear_regression: 'Multiple Linear Regression',
  epidemic_curve: 'Epidemic Curve',
  attack_rate_table: 'Attack Rate Table',
  age_sex_pyramid: 'Age-Sex Pyramid',
  survival_analysis: 'Survival Analysis',
  moving_average: 'Moving Average (7-day)',
}

function getTransporter() {
  const user = process.env.YAHOO_EMAIL
  const pass = process.env.YAHOO_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('YAHOO_EMAIL and YAHOO_APP_PASSWORD environment variables are required.')
  }

  return nodemailer.createTransport({
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  })
}

export interface AnalysisCompleteEmailData {
  toEmail: string
  datasetName: string
  selectedTest: string
  researchQuestion: string
  executionSuccess: boolean
  executionTimeMs: number
  appUrl?: string
}

export async function sendAnalysisCompleteEmail(data: AnalysisCompleteEmailData): Promise<void> {
  const transporter = getTransporter()
  const fromEmail = process.env.YAHOO_EMAIL!
  const testLabel = TEST_LABELS[data.selectedTest] || data.selectedTest
  const appUrl = data.appUrl || 'https://r-research-assistant-vx33.vercel.app'
  const historyUrl = `${appUrl}/history`
  const statusText = data.executionSuccess ? 'completed successfully' : 'completed with errors'
  const statusEmoji = data.executionSuccess ? '✅' : '⚠️'
  const timeSeconds = (data.executionTimeMs / 1000).toFixed(1)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Analysis Complete — JOANResearchOS</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f2338 0%,#1a3a5c 100%);padding:28px 32px;border-radius:12px 12px 0 0;">
              <table width="100%">
                <tr>
                  <td>
                    <div style="display:inline-block;width:36px;height:36px;background:linear-gradient(135deg,#7c5cff,#2e75b6);border-radius:9px;text-align:center;line-height:36px;font-weight:800;font-size:16px;color:#fff;vertical-align:middle;">J</div>
                    <span style="color:#fff;font-size:16px;font-weight:700;vertical-align:middle;margin-left:10px;">JOANResearchOS</span>
                  </td>
                  <td align="right">
                    <span style="color:#8b9bc4;font-size:12px;">Statistical Analysis Platform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">

              <p style="font-size:22px;font-weight:800;color:#1a3a5c;margin:0 0 6px;">${statusEmoji} Your analysis ${statusText}</p>
              <p style="font-size:14px;color:#666;margin:0 0 28px;">Completed in ${timeSeconds}s · All statistical values computed by R</p>

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="8">
                      <tr>
                        <td style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;">Dataset</td>
                        <td style="font-size:13px;color:#1a1a1a;font-weight:600;text-align:right;">${data.datasetName}</td>
                      </tr>
                      <tr><td colspan="2" style="height:8px;"></td></tr>
                      <tr>
                        <td style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;">Statistical Test</td>
                        <td style="font-size:13px;color:#1a1a1a;font-weight:600;text-align:right;">${testLabel}</td>
                      </tr>
                      <tr><td colspan="2" style="height:8px;"></td></tr>
                      <tr>
                        <td colspan="2" style="font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;">Research Question</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="font-size:13px;color:#1a3a5c;font-style:italic;background:#eef4fb;padding:10px 12px;border-radius:6px;border-left:3px solid #2e75b6;">"${data.researchQuestion}"</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${data.executionSuccess ? `
              <!-- Trust note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="font-size:12px;color:#166534;margin:0;">
                      <strong>Verified by R</strong> — Every p-value, confidence interval, and effect size in your report was computed by R, not estimated by AI. The full R script and raw output are available in your results.
                    </p>
                  </td>
                </tr>
              </table>` : `
              <!-- Error note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="font-size:12px;color:#991b1b;margin:0;">
                      R encountered an error during execution. Check the Raw R Output tab in your results for details. You can adjust your research question and try again.
                    </p>
                  </td>
                </tr>
              </table>`}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${historyUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#7c5cff,#2e75b6);color:#fff;text-decoration:none;padding:13px 32px;border-radius:9px;font-size:14px;font-weight:700;">
                      View in Analysis History →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;">
              <p style="font-size:12px;color:#999;margin:0;text-align:center;">
                JOANResearchOS · Statistical Engine: R · AI: Claude by Anthropic<br>
                <a href="${appUrl}" style="color:#2e75b6;text-decoration:none;">Open app</a> ·
                <a href="${appUrl}/history" style="color:#2e75b6;text-decoration:none;">History</a> ·
                <a href="mailto:${fromEmail}" style="color:#999;text-decoration:none;">Contact</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const subject = data.executionSuccess
    ? `✅ Analysis complete — ${testLabel} · ${data.datasetName}`
    : `⚠️ Analysis finished with errors — ${testLabel} · ${data.datasetName}`

  await transporter.sendMail({
    from: `"JOANResearchOS" <${fromEmail}>`,
    to: data.toEmail,
    subject,
    html,
  })
}
