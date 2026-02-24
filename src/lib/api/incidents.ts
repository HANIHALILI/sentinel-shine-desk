import { api } from './client';
import type {
  Incident,
  IncidentDetail,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  CreateIncidentUpdateRequest,
  IncidentUpdate,
  PaginatedResponse,
} from './types';

export const incidentsApi = {
  list: (params?: { statusPageId?: string; status?: string; page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<Incident>>('/incidents', params),

  getById: (id: string) =>
    api.get<IncidentDetail>(`/incidents/${id}`),

  create: (data: CreateIncidentRequest) =>
    api.post<Incident>('/incidents', data),

  update: (id: string, data: UpdateIncidentRequest) =>
    api.patch<Incident>(`/incidents/${id}`, data),

  delete: (id: string) =>
    api.delete(`/incidents/${id}`),

  addUpdate: (incidentId: string, data: CreateIncidentUpdateRequest) =>
    api.post<IncidentUpdate>(`/incidents/${incidentId}/updates`, data),
};
