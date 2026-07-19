export type Severity = "Low" | "Medium" | "High" | null;

export interface ErrorDetail {
  field: string;
  detail: string;
}

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors: ErrorDetail[] | null;
}

export interface PredictionOut {
  id: string;
  crop_type: string;
  image_filename: string | null;
  farmer_notes: string | null;
  predicted_disease: string;
  confidence: number;
  severity: Severity;
  recommendation: string | null;
  ai_provider: string | null;
  created_at: string;
}

export interface PaginatedPredictions {
  items: PredictionOut[];
  total: number;
  page: number;
  page_size: number;
}
