import { api } from './client';
import type { MetricsResponse, MetricRange, MetricResolution } from './types';

export const metricsApi = {
  get: (serviceId: string, range: MetricRange = '24h', resolution: MetricResolution = '1m') =>
    api.get<MetricsResponse>(`/metrics/${serviceId}`, { range, resolution }),
};
