"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { api } from "../../services/api";
import { AnalyticsSummary } from "../../types/analytics";
import Spinner from "../../components/ui/Spinner";
import ErrorBanner from "../../components/ui/ErrorBanner";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

/**
 * AnalyticsDashboard page — displays aggregate insights about all predictions.
 * Shows: 2 Recharts charts (disease distribution pie, 7-day volume bar) + summary cards.
 * Loading/Error/Empty states are explicitly handled.
 */
export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.getAnalyticsSummary();
        if (!res.success) {
          setError(res.message || "Failed to load analytics");
        } else {
          setSummary(res.data);
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Aggregated insights across all predictions</p>
          </div>
          <div className="flex gap-3">
            <Link href="/history" className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              History
            </Link>
            <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + New Diagnosis
            </Link>
          </div>
        </header>

        {loading && <Spinner />}
        {error && <ErrorBanner message={error} />}

        {!loading && !error && summary?.total_predictions === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-gray-400 text-lg">No data yet.</p>
            <Link href="/" className="text-blue-600 font-medium mt-2 inline-block hover:underline">
              Upload your first crop image →
            </Link>
          </div>
        )}

        {!loading && summary && summary.total_predictions > 0 && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium">Total Predictions</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">{summary.total_predictions}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium">Avg. AI Confidence</p>
                <p className="text-4xl font-bold text-blue-600 mt-1">
                  {(summary.avg_confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 font-medium">Unique Diseases Found</p>
                <p className="text-4xl font-bold text-green-600 mt-1">
                  {summary.disease_distribution.length}
                </p>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 7-Day Volume Bar Chart */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Predictions (Last 7 Days)</h2>
                {summary.daily_volume.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No data for the last 7 days.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={summary.daily_volume} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Disease Distribution Pie Chart */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Disease Distribution</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={summary.disease_distribution}
                      dataKey="count"
                      nameKey="disease"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {summary.disease_distribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Severity table */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Severity Breakdown</h2>
              <div className="flex gap-6">
                {summary.severity_distribution.map((s) => {
                  const color = s.severity === "High" ? "text-red-600" : s.severity === "Medium" ? "text-yellow-600" : "text-green-600";
                  return (
                    <div key={s.severity} className="text-center">
                      <p className={`text-3xl font-bold ${color}`}>{s.count}</p>
                      <p className="text-sm text-gray-500 font-medium mt-1">{s.severity}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
