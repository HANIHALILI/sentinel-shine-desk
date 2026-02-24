import { useQuery } from '@tanstack/react-query';
import { metrics } from '@/lib/db';
import type { MetricPoint } from '@/lib/api/types';

export function useMetrics(serviceId: string, rangeHours = 24) {
  return useQuery<MetricPoint[]>({
    queryKey: ['metrics', serviceId, rangeHours],
    queryFn: () => metrics.get(serviceId, rangeHours),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: !!serviceId,
  });
}
