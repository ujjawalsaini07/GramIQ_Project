export interface AnalyticsSummary {
  total_predictions: number;
  avg_confidence: number;
  disease_distribution: { disease: string; count: number }[];
  daily_volume: { date: string; count: number }[];
  severity_distribution: { severity: string; count: number }[];
}
