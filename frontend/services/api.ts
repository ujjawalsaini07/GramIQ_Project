import { APIResponse, PredictionOut, PaginatedPredictions, PredictionFilters } from "../types/prediction";
import { AnalyticsSummary } from "../types/analytics";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Single fetch client for the frontend.
 */
export const api = {
  /**
   * Upload a new crop image for prediction.
   * @param file The image file
   * @param cropType The crop type
   * @param notes Optional farmer notes
   * @returns APIResponse with PredictionOut
   */
  async createPrediction(file: File, cropType: string, notes?: string): Promise<APIResponse<PredictionOut>> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("crop_type", cropType);
    if (notes) formData.append("farmer_notes", notes);

    const res = await fetch(`${API_URL}/predictions`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  /**
   * Get a paginated list of predictions.
   * @param page Page number
   * @param pageSize Items per page
   * @param filters Optional crop, disease, and date range filters
   * @returns APIResponse with PaginatedPredictions
   */
  async getPredictions(
    page: number = 1,
    pageSize: number = 10,
    filters: PredictionFilters = {}
  ): Promise<APIResponse<PaginatedPredictions>> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value?.trim()) {
        params.set(key, value.trim());
      }
    });

    const res = await fetch(`${API_URL}/predictions?${params.toString()}`, {
      cache: "no-store",
    });
    return res.json();
  },

  /**
   * Get a single prediction by ID.
   * @param id Prediction UUID
   * @returns APIResponse with PredictionOut
   */
  async getPrediction(id: string): Promise<APIResponse<PredictionOut>> {
    const res = await fetch(`${API_URL}/predictions/${id}`, {
      cache: "no-store",
    });
    return res.json();
  },

  /**
   * Get aggregated analytics summary data.
   * @returns APIResponse with AnalyticsSummary (totals, disease/severity distributions, 7-day volume)
   */
  async getAnalyticsSummary(): Promise<APIResponse<AnalyticsSummary>> {
    const res = await fetch(`${API_URL}/analytics/summary`, {
      cache: "no-store",
    });
    return res.json();
  }
};
