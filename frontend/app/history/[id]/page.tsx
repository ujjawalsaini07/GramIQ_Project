"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "../../../services/api";
import { PredictionOut } from "../../../types/prediction";
import PredictionDetail from "../../../components/PredictionDetail";
import Spinner from "../../../components/ui/Spinner";
import ErrorBanner from "../../../components/ui/ErrorBanner";

/**
 * Prediction detail page — shows the full diagnosis for a single prediction.
 * Params: id (UUID from URL)
 * Loading/Error/Empty states are explicitly handled.
 */
export default function PredictionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [prediction, setPrediction] = useState<PredictionOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchPrediction = async () => {
      try {
        const res = await api.getPrediction(id);
        if (!res.success) {
          setError(res.message || "Prediction not found");
        } else {
          setPrediction(res.data);
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchPrediction();
  }, [id]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 flex items-center gap-4">
          <Link href="/history" className="text-blue-600 hover:underline text-sm font-medium">
            ← Back to History
          </Link>
        </header>

        {loading && <Spinner />}
        {error && <ErrorBanner message={error} />}

        {!loading && prediction && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Diagnosis Detail</h1>
            <PredictionDetail prediction={prediction} />
          </div>
        )}
      </div>
    </main>
  );
}
