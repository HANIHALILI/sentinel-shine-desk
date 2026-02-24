import { api } from './client';
import type { MetricsResponse, MetricRange, MetricResolution, ServiceSummary } from './types';

export const metricsApi = {
  /** Get bucketed metrics — percentiles computed at query time from raw checks */
  get: (serviceId: string, range: MetricRange = '24h', resolution: MetricResolution = '1m') =>
    api.get<MetricsResponse>(`/metrics/${serviceId}`, { range, resolution }),

  /** Get service summary stats (availability, p95, p99) */
  summary: (serviceId: string, hours: number = 24) =>
    api.get<ServiceSummary>(`/metrics/${serviceId}/summary`, { hours }),
};
