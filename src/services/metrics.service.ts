import { metricsRepository } from "@/repositories/metrics.repository";

export async function getDashboardMetrics() {
  return metricsRepository.getDashboard();
}