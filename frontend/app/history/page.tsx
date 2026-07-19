"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "../../services/api";
import { PredictionOut, PaginatedPredictions } from "../../types/prediction";
import Spinner from "../../components/ui/Spinner";
import ErrorBanner from "../../components/ui/ErrorBanner";

/**
 * HistoryTable page — paginated list of all past predictions.
 * Props: none (uses query params internally for page state)
 * Loading/Error/Empty states are all explicitly handled.
 */
export default function HistoryPage() {
  const [data, setData] = useState<PaginatedPredictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getPredictions(page, PAGE_SIZE);
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
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const severityBadge = (severity: string | null) => {
    if (severity === "High") return "bg-red-100 text-red-700";
    if (severity === "Medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prediction History</h1>
            <p className="text-gray-600 mt-1">All past crop diagnoses</p>
          </div>
          <Link
            href="/"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Diagnosis
          </Link>
        </header>

        {loading && <Spinner />}
        {error && <ErrorBanner message={error} />}

        {!loading && !error && data?.items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-gray-400 text-lg">No predictions yet.</p>
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
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
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
