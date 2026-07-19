import { PredictionOut } from "../types/prediction";

/**
 * PredictionDetail displays the structured diagnosis data.
 */
export default function PredictionDetail({ prediction }: { prediction: PredictionOut }) {
  // Confidence visualizer
  const confidenceColor = 
    prediction.confidence > 0.8 ? "bg-green-500" : 
    prediction.confidence > 0.5 ? "bg-yellow-500" : "bg-red-500";

  const severityColor = 
    prediction.severity === "High" ? "text-red-700 bg-red-100" :
    prediction.severity === "Medium" ? "text-yellow-700 bg-yellow-100" :
    "text-green-700 bg-green-100";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {prediction.image_filename && (
          <div className="w-full md:w-1/3">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
              {/* Using a standard img tag for simplicity, pointing to the backend's static route (if we serve it) or just a placeholder */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Image: {prediction.image_filename}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{prediction.predicted_disease}</h3>
            <p className="text-gray-500 font-medium">Crop: {prediction.crop_type}</p>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-medium text-gray-700">AI Confidence</span>
              <span className="text-sm font-bold text-gray-900">{(prediction.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full ${confidenceColor}`} style={{ width: `${prediction.confidence * 100}%` }}></div>
            </div>
          </div>

          {prediction.severity && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm font-medium text-gray-700">Severity:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${severityColor}`}>
                {prediction.severity}
              </span>
            </div>
          )}
        </div>
      </div>

      {prediction.recommendation && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md mt-6">
          <h4 className="text-blue-800 font-semibold mb-1">Recommendation</h4>
          <p className="text-blue-900 text-sm leading-relaxed">{prediction.recommendation}</p>
        </div>
      )}

      {prediction.farmer_notes && (
        <div className="text-sm text-gray-600 mt-4 border-t pt-4">
          <strong>Notes: </strong> {prediction.farmer_notes}
        </div>
      )}

      <div className="text-xs text-gray-400 mt-4 text-right">
        Analyzed by {prediction.ai_provider} at {new Date(prediction.created_at).toLocaleString()}
      </div>
    </div>
  );
}
