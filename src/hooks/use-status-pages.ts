import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statusPages, realtime } from '@/lib/db';
import type { StatusPage, StatusPageDetail, PaginatedResponse } from '@/lib/api/types';

export function useStatusPages(page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<StatusPage>>({
    queryKey: ['status-pages', page, pageSize],
    queryFn: () => statusPages.list(page, pageSize),
    staleTime: 30_000,
  });
}

export function useStatusPage(slug: string) {
  const queryClient = useQueryClient();

  const query = useQuery<StatusPageDetail | null>({
    queryKey: ['status-page', slug],
    queryFn: () => statusPages.getBySlug(slug),
    staleTime: 15_000,
    refetchInterval: 60_000,
    enabled: !!slug,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!slug) return;

    const unsubs = [
      realtime.subscribeToTable('services', () => {
        queryClient.invalidateQueries({ queryKey: ['status-page', slug] });
      }),
      realtime.subscribeToTable('incidents', () => {
        queryClient.invalidateQueries({ queryKey: ['status-page', slug] });
      }),
      realtime.subscribeToTable('broadcasts', () => {
        queryClient.invalidateQueries({ queryKey: ['status-page', slug] });
      }),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [slug, queryClient]);

  return query;
}
