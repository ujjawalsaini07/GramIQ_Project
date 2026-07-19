"use client";
import { useState } from "react";
import { api } from "../services/api";
import { PredictionOut } from "../types/prediction";
import Spinner from "./ui/Spinner";
import ErrorBanner from "./ui/ErrorBanner";
import PredictionDetail from "./PredictionDetail";

/**
 * UploadPanel handles image and data collection, submits to API, and shows the result.
 */
export default function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [cropType, setCropType] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState<PredictionOut | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file.");
      return;
    }
    // Client-side validation
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Unsupported file type. Please upload a JPEG, PNG, or WebP.");
      return;
    }

    setLoading(true);
    setError("");
    setPrediction(null);

    try {
      const res = await api.createPrediction(file, cropType, notes);
      if (!res.success) {
        setError(res.message || "Failed to submit prediction");
      } else if (res.data) {
        setPrediction(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">New Diagnosis</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crop Image *</label>
            <input 
              type="file" 
              accept="image/jpeg, image/png, image/webp" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP up to 10MB.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type *</label>
            <input 
              type="text" 
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Tomato, Wheat"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
              placeholder="Any context about the environment or symptoms..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Analyzing Image..." : "Analyze Crop"}
          </button>
        </form>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBanner message={error} />}
      {prediction && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Diagnosis Result</h2>
          <PredictionDetail prediction={prediction} />
        </div>
      )}
    </div>
  );
}
