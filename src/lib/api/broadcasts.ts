import { api } from './client';
import type { BroadcastMessage, CreateBroadcastRequest } from './types';

export const broadcastsApi = {
  getActive: (statusPageId: string) =>
    api.get<BroadcastMessage | null>(`/broadcasts/active`, { statusPageId }),

  create: (data: CreateBroadcastRequest) =>
    api.post<BroadcastMessage>('/broadcasts', data),

  delete: (id: string) =>
    api.delete(`/broadcasts/${id}`),
};
