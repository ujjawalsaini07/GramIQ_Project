"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [cropType, setCropType] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("crop_type", cropType);
    if (notes) formData.append("farmer_notes", notes);

    try {
      const res = await fetch("http://localhost:8000/api/v1/predictions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to submit prediction");
      } else {
        setResult(data.data);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Krishi Clinic Lite - Upload</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4 border p-6 rounded shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-1">Crop Image</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full border p-2 rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Crop Type</label>
          <input 
            type="text" 
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="e.g. Tomato"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="Any field notes..."
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Submit for Diagnosis"}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto border border-gray-200 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
