"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "../../services/api";
import { PredictionOut, PaginatedPredictions, PredictionFilters } from "../../types/prediction";
import Spinner from "../../components/ui/Spinner";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { Download, RotateCcw, Search } from "lucide-react";
import {
  downloadPredictionsCsv,
  exportHistoryPdf,
  ExportFormat,
  ExportScope,
} from "../../services/export";

/**
 * HistoryTable page — paginated and filterable list of all past predictions.
 * Props: none (uses query params internally for page state)
 * Loading/Error/Empty states are all explicitly handled; export uses the selected scope and format.
 */
export default function HistoryPage() {
  const [data, setData] = useState<PaginatedPredictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<PredictionFilters>({});
  const [filters, setFilters] = useState<PredictionFilters>({});
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [exportScope, setExportScope] = useState<ExportScope>("filtered");
  const PAGE_SIZE = 10;
  const EXPORT_PAGE_SIZE = 100;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getPredictions(page, PAGE_SIZE, filters);
        if (!res.success) {
          setError(res.message || "Failed to load history");
        } else {
          setData(res.data);
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [page, filters]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasActiveFilters = Object.values(filters).some((value) => Boolean(value?.trim()));

  const severityBadge = (severity: string | null) => {
    if (severity === "High") return "bg-red-100 text-red-700";
    if (severity === "Medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const updateDraftFilter = (key: keyof PredictionFilters, value: string) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraftFilters({});
    setFilters({});
    setPage(1);
  };

  const fetchExportItems = async (scope: ExportScope) => {
    const exportFilters = scope === "filtered" ? filters : {};
    const firstPage = await api.getPredictions(1, EXPORT_PAGE_SIZE, exportFilters);
    if (!firstPage.success || !firstPage.data) {
      throw new Error(firstPage.message || "Failed to export history");
    }

    const allItems = [...firstPage.data.items];
    const exportPages = Math.ceil(firstPage.data.total / EXPORT_PAGE_SIZE);

    for (let exportPage = 2; exportPage <= exportPages; exportPage += 1) {
      const res = await api.getPredictions(exportPage, EXPORT_PAGE_SIZE, exportFilters);
      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to export history");
      }
      allItems.push(...res.data.items);
    }

    return allItems;
  };

  const exportHistory = async () => {
    setExporting(true);
    setError("");

    try {
      const exportItems = await fetchExportItems(exportScope);
      const filenameScope = exportScope === "filtered" && hasActiveFilters ? "filtered" : "all";
      const filenameStem = `krishi-predictions-${filenameScope}-${new Date().toISOString().slice(0, 10)}`;

      if (exportFormat === "csv") {
        downloadPredictionsCsv(exportItems, filenameStem);
      } else {
        exportHistoryPdf(
          exportItems,
          exportScope === "filtered" ? filters : {},
          exportScope === "filtered" ? "Filtered results" : "All predictions"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export history. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prediction History</h1>
            <p className="text-gray-600 mt-1">All past crop diagnoses</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={exportFormat}
              onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              aria-label="Export format"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
            <select
              value={exportScope}
              onChange={(event) => setExportScope(event.target.value as ExportScope)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              aria-label="Export scope"
            >
              <option value="filtered">Filtered results</option>
              <option value="all">All predictions</option>
            </select>
            <button
              type="button"
              onClick={exportHistory}
              disabled={loading || exporting}
              className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting" : "Export"}
            </button>
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Diagnosis
            </Link>
          </div>
        </header>

        <form
          onSubmit={applyFilters}
          className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
        >
          <label className="md:col-span-1">
            <span className="block text-xs font-semibold text-gray-500 mb-1">Crop</span>
            <input
              type="search"
              value={draftFilters.crop_type || ""}
              onChange={(event) => updateDraftFilter("crop_type", event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Tomato"
            />
          </label>
          <label className="md:col-span-1">
            <span className="block text-xs font-semibold text-gray-500 mb-1">Disease</span>
            <input
              type="search"
              value={draftFilters.disease || ""}
              onChange={(event) => updateDraftFilter("disease", event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Rust"
            />
          </label>
          <label className="md:col-span-1">
            <span className="block text-xs font-semibold text-gray-500 mb-1">From</span>
            <input
              type="date"
              value={draftFilters.date_from || ""}
              onChange={(event) => updateDraftFilter("date_from", event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
          <label className="md:col-span-1">
            <span className="block text-xs font-semibold text-gray-500 mb-1">To</span>
            <input
              type="date"
              value={draftFilters.date_to || ""}
              onChange={(event) => updateDraftFilter("date_to", event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Search className="h-4 w-4" />
            Filter
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </form>

        {loading && <Spinner />}
        {error && <ErrorBanner message={error} />}

        {!loading && !error && data?.items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-gray-400 text-lg">
              {hasActiveFilters ? "No predictions match these filters." : "No predictions yet."}
            </p>
            <Link href="/" className="text-blue-600 font-medium mt-2 inline-block hover:underline">
              Upload your first crop image →
            </Link>
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Crop</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Diagnosis</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Confidence</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Severity</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((p: PredictionOut) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.crop_type}</td>
                      <td className="px-4 py-3 text-gray-700">{p.predicted_disease}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${p.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-gray-600">{(p.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityBadge(p.severity)}`}>
                          {p.severity || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/history/${p.id}`}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
