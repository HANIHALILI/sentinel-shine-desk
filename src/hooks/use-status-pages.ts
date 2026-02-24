import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statusPagesApi } from '@/lib/api/status-pages';
import { wsManager } from '@/lib/api/websocket';
import type { StatusPage, StatusPageDetail, PaginatedResponse } from '@/lib/api/types';

export function useStatusPages(page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<StatusPage>>({
    queryKey: ['status-pages', page, pageSize],
    queryFn: () => statusPagesApi.list({ page, pageSize }),
    staleTime: 30_000,
  });
}

export function useStatusPage(slug: string) {
  const queryClient = useQueryClient();

  const query = useQuery<StatusPageDetail>({
    queryKey: ['status-page', slug],
    queryFn: () => statusPagesApi.getBySlug(slug),
    staleTime: 15_000,
    refetchInterval: 60_000, // Fallback polling every 60s
  });

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!query.data?.id) return;

    wsManager.connect(query.data.id);

    const unsub = wsManager.on('*', () => {
      queryClient.invalidateQueries({ queryKey: ['status-page', slug] });
    });

    return () => {
      unsub();
      wsManager.disconnect();
    };
  }, [query.data?.id, slug, queryClient]);

  return query;
}
