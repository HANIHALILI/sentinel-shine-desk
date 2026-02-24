import { useQuery } from '@tanstack/react-query';
import { incidents } from '@/lib/db';
import type { Incident, IncidentDetail, PaginatedResponse } from '@/lib/api/types';

export function useIncidents(statusPageId?: string, status?: string, page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<Incident>>({
    queryKey: ['incidents', statusPageId, status, page, pageSize],
    queryFn: () => incidents.list(statusPageId, status, page, pageSize),
    staleTime: 30_000,
  });
}

export function useIncident(id: string) {
  return useQuery<IncidentDetail>({
    queryKey: ['incident', id],
    queryFn: () => incidents.getById(id),
    enabled: !!id,
  });
}
