import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/lib/api/services';
import type { Service, PaginatedResponse } from '@/lib/api/types';

export function useServices(statusPageId?: string, page = 1, pageSize = 50) {
  return useQuery<PaginatedResponse<Service>>({
    queryKey: ['services', statusPageId, page, pageSize],
    queryFn: () => servicesApi.list({ statusPageId, page, pageSize }),
    staleTime: 30_000,
  });
}
