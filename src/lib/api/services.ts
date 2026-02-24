import { api } from './client';
import type {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  PaginatedResponse,
} from './types';

export const servicesApi = {
  list: (params?: { statusPageId?: string; page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<Service>>('/services', params),

  getById: (id: string) =>
    api.get<Service>(`/services/${id}`),

  create: (data: CreateServiceRequest) =>
    api.post<Service>('/services', data),

  update: (id: string, data: UpdateServiceRequest) =>
    api.patch<Service>(`/services/${id}`, data),

  delete: (id: string) =>
    api.delete(`/services/${id}`),
};
