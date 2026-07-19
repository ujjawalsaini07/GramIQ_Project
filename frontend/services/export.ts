import { PredictionFilters, PredictionOut } from "../types/prediction";

export type ExportFormat = "csv" | "pdf";
export type ExportScope = "filtered" | "all";

const reportDate = () => new Date().toLocaleString();

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const csvCell = (value: string | number | null | undefined) => {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
};

const confidencePercent = (confidence: number) => `${(confidence * 100).toFixed(1)}%`;

const predictionRows = (predictions: PredictionOut[]) =>
  predictions.map((prediction) => [
    prediction.id,
    prediction.crop_type,
    prediction.predicted_disease,
    prediction.confidence,
    prediction.severity,
    prediction.recommendation,
    prediction.farmer_notes,
    prediction.ai_provider,
    prediction.created_at,
    prediction.image_url,
  ]);

const csvHeaders = [
  "id",
  "crop_type",
  "predicted_disease",
  "confidence",
  "severity",
  "recommendation",
  "farmer_notes",
  "ai_provider",
  "created_at",
  "image_url",
];

/**
 * Download a CSV file for a list of prediction records.
 * Params: predictions array and filename stem.
 * Return shape: void; triggers a browser download.
 * Loading/error behavior: caller owns loading/error state.
 */
export function downloadPredictionsCsv(predictions: PredictionOut[], filenameStem: string) {
  const csv = [csvHeaders, ...predictionRows(predictions)]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenameStem}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

const filtersSummary = (filters: PredictionFilters) => {
  const entries = [
    ["Crop", filters.crop_type],
    ["Disease", filters.disease],
    ["From", filters.date_from],
    ["To", filters.date_to],
  ].filter(([, value]) => Boolean(value?.trim()));

  if (entries.length === 0) return "All predictions";
  return entries.map(([label, value]) => `${label}: ${value}`).join(" | ");
};

const printDocument = (title: string, body: string) => {
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups to export PDF.");
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
          }
          .report {
            max-width: 980px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .eyebrow {
            color: #047857;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          h1 {
            margin: 8px 0 6px;
            font-size: 28px;
            line-height: 1.15;
          }
          h2 {
            margin: 0 0 12px;
            font-size: 18px;
          }
          .meta {
            color: #475569;
            font-size: 12px;
          }
          .grid {
            display: grid;
            grid-template-columns: 250px 1fr;
            gap: 22px;
            align-items: start;
          }
          .image-box {
            width: 250px;
            height: 250px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            overflow: hidden;
            background: #f8fafc;
          }
          .image-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .placeholder {
            height: 100%;
            display: grid;
            place-items: center;
            color: #64748b;
            font-size: 13px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 16px;
            break-inside: avoid;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .metric {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            background: #f8fafc;
          }
          .label {
            color: #64748b;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .value {
            margin-top: 6px;
            font-size: 18px;
            font-weight: 700;
          }
          .recommendation {
            line-height: 1.55;
            white-space: pre-wrap;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            color: #334155;
            background: #f1f5f9;
            font-size: 10px;
            text-transform: uppercase;
          }
          .summary {
            display: flex;
            gap: 12px;
            margin-bottom: 18px;
          }
          .summary .metric {
            flex: 1;
          }
          @media print {
            body { padding: 18mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${body}
        <script>
          window.addEventListener("load", () => setTimeout(() => window.print(), 350));
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Open a print-ready PDF report for a single prediction.
 * Params: one PredictionOut record.
 * Return shape: void; opens browser print/save-as-PDF flow.
 * Loading/error behavior: throws when popups are blocked, caller should show the message.
 */
export function exportPredictionPdf(prediction: PredictionOut) {
  const createdAt = new Date(prediction.created_at).toLocaleString();
  const imageMarkup = prediction.image_url
    ? `<img src="${escapeHtml(prediction.image_url)}" alt="${escapeHtml(prediction.predicted_disease)}" />`
    : `<div class="placeholder">No image URL available</div>`;

  printDocument(
    `Prediction Report - ${prediction.predicted_disease}`,
    `
      <main class="report">
        <section class="header">
          <div class="eyebrow">Krishi Clinic Lite</div>
          <h1>Crop Disease Diagnosis Report</h1>
          <div class="meta">Generated ${escapeHtml(reportDate())}</div>
        </section>

        <section class="grid">
          <div class="image-box">${imageMarkup}</div>
          <div>
            <div class="card">
              <div class="eyebrow">Diagnosis</div>
              <h1>${escapeHtml(prediction.predicted_disease)}</h1>
              <p><strong>Crop:</strong> ${escapeHtml(prediction.crop_type)}</p>
              <p><strong>Created:</strong> ${escapeHtml(createdAt)}</p>
            </div>
            <div class="metrics">
              <div class="metric">
                <div class="label">Confidence</div>
                <div class="value">${escapeHtml(confidencePercent(prediction.confidence))}</div>
              </div>
              <div class="metric">
                <div class="label">Severity</div>
                <div class="value">${escapeHtml(prediction.severity || "Unknown")}</div>
              </div>
              <div class="metric">
                <div class="label">Provider</div>
                <div class="value">${escapeHtml(prediction.ai_provider || "Unknown")}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>Treatment Recommendation</h2>
          <div class="recommendation">${escapeHtml(prediction.recommendation || "No recommendation provided.")}</div>
        </section>

        <section class="card">
          <h2>Field Notes</h2>
          <div class="recommendation">${escapeHtml(prediction.farmer_notes || "No field notes provided.")}</div>
        </section>
      </main>
    `
  );
}

/**
 * Open a print-ready PDF report for prediction history.
 * Params: predictions array, active filters, and scope label.
 * Return shape: void; opens browser print/save-as-PDF flow.
 * Loading/error behavior: throws when popups are blocked, caller should show the message.
 */
export function exportHistoryPdf(
  predictions: PredictionOut[],
  filters: PredictionFilters,
  scopeLabel: string
) {
  const avgConfidence =
    predictions.length > 0
      ? predictions.reduce((sum, prediction) => sum + prediction.confidence, 0) / predictions.length
      : 0;
  const rows = predictions
    .map(
      (prediction) => `
        <tr>
          <td>${escapeHtml(prediction.crop_type)}</td>
          <td>${escapeHtml(prediction.predicted_disease)}</td>
          <td>${escapeHtml(confidencePercent(prediction.confidence))}</td>
          <td>${escapeHtml(prediction.severity || "Unknown")}</td>
          <td>${escapeHtml(new Date(prediction.created_at).toLocaleDateString())}</td>
          <td>${escapeHtml(prediction.recommendation || "")}</td>
        </tr>
      `
    )
    .join("");

  printDocument(
    "Prediction History Report",
    `
      <main class="report">
        <section class="header">
          <div class="eyebrow">Krishi Clinic Lite</div>
          <h1>Prediction History Report</h1>
          <div class="meta">Generated ${escapeHtml(reportDate())}</div>
          <div class="meta">Scope: ${escapeHtml(scopeLabel)} | ${escapeHtml(filtersSummary(filters))}</div>
        </section>

        <section class="summary">
          <div class="metric">
            <div class="label">Records</div>
            <div class="value">${predictions.length}</div>
          </div>
          <div class="metric">
            <div class="label">Average Confidence</div>
            <div class="value">${escapeHtml(confidencePercent(avgConfidence))}</div>
          </div>
          <div class="metric">
            <div class="label">Generated</div>
            <div class="value">${escapeHtml(new Date().toLocaleDateString())}</div>
          </div>
        </section>

        <section class="card">
          <table>
            <thead>
              <tr>
                <th>Crop</th>
                <th>Diagnosis</th>
                <th>Confidence</th>
                <th>Severity</th>
                <th>Date</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="6">No predictions found.</td></tr>`}</tbody>
          </table>
        </section>
      </main>
    `
  );
}
