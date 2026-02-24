import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/lib/api/metrics';
import type { MetricsResponse, MetricRange, MetricResolution } from '@/lib/api/types';

export function useMetrics(serviceId: string, range: MetricRange = '24h', resolution: MetricResolution = '1m') {
  return useQuery<MetricsResponse>({
    queryKey: ['metrics', serviceId, range, resolution],
    queryFn: () => metricsApi.get(serviceId, range, resolution),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: !!serviceId,
  });
}
