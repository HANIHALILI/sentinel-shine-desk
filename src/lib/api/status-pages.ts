import { api } from './client';
import type {
  StatusPage,
  StatusPageDetail,
  CreateStatusPageRequest,
  UpdateStatusPageRequest,
  PaginatedResponse,
} from './types';

export const statusPagesApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<StatusPage>>('/status-pages', params),

  getBySlug: (slug: string) =>
    api.get<StatusPageDetail>(`/status-pages/by-slug/${slug}`),

  getById: (id: string) =>
    api.get<StatusPageDetail>(`/status-pages/${id}`),

  create: (data: CreateStatusPageRequest) =>
    api.post<StatusPage>('/status-pages', data),

  update: (id: string, data: UpdateStatusPageRequest) =>
    api.put<StatusPage>(`/status-pages/${id}`, data),

  delete: (id: string) =>
    api.delete(`/status-pages/${id}`),
};
