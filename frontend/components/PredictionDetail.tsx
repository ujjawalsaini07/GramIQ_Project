import { PredictionOut } from "../types/prediction";
import { AlertCircle, CheckCircle2, Sprout, HeartPulse, Stethoscope, Clock, FileDown } from 'lucide-react';
import Image from "next/image";
import { exportPredictionPdf } from "../services/export";

/**
 * PredictionDetail displays the structured diagnosis data with a polished UI.
 */
export default function PredictionDetail({ prediction }: { prediction: PredictionOut }) {
  // Confidence visualizer
  const confidenceColor = 
    prediction.confidence > 0.8 ? "bg-emerald-500" : 
    prediction.confidence > 0.5 ? "bg-amber-500" : "bg-rose-500";
    
  const confidenceText = 
    prediction.confidence > 0.8 ? "text-emerald-700" : 
    prediction.confidence > 0.5 ? "text-amber-700" : "text-rose-700";

  const severityConfig = {
    High: { color: "text-rose-700 bg-rose-100 border-rose-200", icon: AlertCircle },
    Medium: { color: "text-amber-700 bg-amber-100 border-amber-200", icon: AlertCircle },
    Low: { color: "text-emerald-700 bg-emerald-100 border-emerald-200", icon: CheckCircle2 },
  };

  const severity = prediction.severity as keyof typeof severityConfig;
  const { color: severityColor, icon: SeverityIcon } = severityConfig[severity] || severityConfig.Medium;

  const handlePdfExport = () => {
    try {
      exportPredictionPdf(prediction);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to open PDF export.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handlePdfExport}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <FileDown className="h-4 w-4" />
          Export PDF
        </button>
      </div>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {(prediction.image_url || prediction.image_filename) && (
          <div className="w-full md:w-2/5 shrink-0">
            <div className="aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center group">
              {prediction.image_url ? (
                <Image
                  src={prediction.image_url} 
                  alt={prediction.predicted_disease} 
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover z-10 transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 to-slate-50/20 z-0"></div>
                  <div className="z-10 flex flex-col items-center gap-3 text-slate-400 group-hover:scale-105 transition-transform duration-300">
                     <Sprout className="w-12 h-12 text-slate-300" />
                     <span className="text-sm font-medium">Analyzed Image</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="flex-1 w-full space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <HeartPulse className="w-5 h-5" />
              <span className="text-sm font-bold tracking-wider uppercase text-blue-600">Diagnosis Report</span>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{prediction.predicted_disease}</h3>
            <div className="flex items-center gap-2 mt-2 text-slate-500 font-medium">
              <Sprout className="w-4 h-4" />
              <span>Crop: {prediction.crop_type}</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-slate-700">AI Confidence Level</span>
              <span className={`text-lg font-bold ${confidenceText}`}>
                {(prediction.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200/60 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full ${confidenceColor} transition-all duration-1000 ease-out`} 
                style={{ width: `${prediction.confidence * 100}%` }}
              ></div>
            </div>
          </div>

          {prediction.severity && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Severity Assessment:</span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${severityColor}`}>
                <SeverityIcon className="w-4 h-4" />
                {prediction.severity}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation Section */}
      {prediction.recommendation && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 text-blue-500/10">
            <Stethoscope className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              <h4 className="text-blue-900 font-bold text-lg">Treatment Recommendation</h4>
            </div>
            <p className="text-blue-800/90 text-base leading-relaxed">{prediction.recommendation}</p>
          </div>
        </div>
      )}

      {/* Footer Notes & Metadata */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-6 border-t border-slate-100 gap-4">
        {prediction.farmer_notes ? (
          <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 flex-1">
            <strong className="text-slate-800 font-semibold">Field Notes: </strong> 
            {prediction.farmer_notes}
          </div>
        ) : (
          <div className="flex-1"></div>
        )}
        
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>Analyzed by <strong className="text-slate-500 uppercase">{prediction.ai_provider}</strong></span>
        </div>
      </div>
    </div>
  );
}
