"use client";
import { useState } from "react";
import Image from "next/image";
import { api } from "../services/api";
import { PredictionOut } from "../types/prediction";
import Spinner from "./ui/Spinner";
import ErrorBanner from "./ui/ErrorBanner";
import PredictionDetail from "./PredictionDetail";
import { UploadCloud, FileType2, AlignLeft, Sparkles } from "lucide-react";
import loaderGuide from "../assests/loader.png";

const COMMON_CROPS = [
  "Tomato",
  "Wheat",
  "Rice",
  "Corn",
  "Potato",
  "Soybean",
  "Cotton",
  "Sugarcane",
  "Onion",
  "Chili",
  "Mango",
  "Banana",
  "Grapes",
  "Apple",
  "Groundnut",
  "Mustard",
];

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
    <div className="space-y-8 animate-in fade-in duration-700">
      {loading && (
        <div className="fixed inset-0 z-[60] hidden lg:grid place-items-center bg-slate-950/35 px-8 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xl shadow-slate-900/20">
            <Image
              src={loaderGuide}
              alt="Crop photo guide showing the correct way to capture a clear affected leaf image"
              className="mx-auto h-auto max-h-[72vh] w-full rounded-xl object-contain"
              priority
            />
            <div className="mt-4 flex items-center justify-center gap-3 text-sm font-semibold text-emerald-700">
              <Spinner />
              <span>Analyzing crop image...</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-50 select-none pointer-events-none">
           <Sparkles className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold mb-6 text-slate-800 tracking-tight">New Diagnosis</h2>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                Crop Image *
              </label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer file:transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl border border-slate-200 p-1.5 bg-slate-50/50"
                  required
                />
              </div>
              <p className="text-xs font-medium text-slate-400 mt-2 ml-1">JPEG, PNG, WebP up to 10MB.</p>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <FileType2 className="w-4 h-4 text-emerald-600" />
                Crop Type *
              </label>
              <input 
                type="text" 
                list="common-crop-types"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                placeholder="e.g. Tomato, Wheat, Rice"
                required
              />
              <datalist id="common-crop-types">
                {COMMON_CROPS.map((crop) => (
                  <option key={crop} value={crop} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <AlignLeft className="w-4 h-4 text-emerald-600" />
                Field Notes <span className="text-slate-400 font-medium">(Optional)</span>
              </label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all h-28 resize-none"
                placeholder="Any context about the environment, weather, or symptoms..."
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-emerald-500 hover:to-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner /> 
                  <span className="ml-2">Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Analyze Crop
                </>
              )}
            </button>

          </form>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      
      {prediction && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <PredictionDetail prediction={prediction} />
        </div>
      )}
    </div>
  );
}
