/**
 * Database abstraction layer.
 * 
 * ALL database access goes through this file.
 * This implementation uses the local StatusGuard backend API
 * which connects to PostgreSQL (local or remote).
 */

import type { 
  StatusPage, StatusPageDetail, Service, Incident, IncidentDetail,
  IncidentUpdate, BroadcastMessage, MetricPoint, PaginatedResponse,
  ServiceStatus, IncidentStatus, IncidentSeverity
} from '@/lib/api/types';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ============================================================
// Helper function to make API requests
// ============================================================
async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any,
  headers?: Record<string, string>
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// Auth (placeholder - implement as needed)
// ============================================================
export const auth = {
  signUp: async (email: string, password: string, name?: string) => {
    try {
      const user = await apiCall<{ id: string; email: string }>('POST', '/auth/signup', {
        email,
        password,
        name,
      });
      if (user?.id) {
        sessionStorage.setItem('auth_user_id', user.id);
      }
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: { message: error.message } };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const user = await apiCall<{ id: string; email: string }>('POST', '/auth/login', {
        email,
        password,
      });
      if (user?.id) {
        sessionStorage.setItem('auth_user_id', user.id);
      }
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: { message: error.message } };
    }
  },

  signOut: async () => {
    try {
      sessionStorage.removeItem('auth_user_id');
      await apiCall('POST', '/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  getSession: async () => {
    try {
      const userId = sessionStorage.getItem('auth_user_id');
      if (!userId) {
        return { data: { session: null } };
      }
      const user = await apiCall<{ id: string; email: string }>('GET', '/auth/user', undefined, {
        'x-user-id': userId,
      });
      return { data: { session: { user } } };
    } catch (error) {
      return { data: { session: null } };
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const userId = sessionStorage.getItem('auth_user_id');
    if (userId) {
      apiCall<{ id: string; email: string }>('GET', '/auth/user', undefined, {
        'x-user-id': userId,
      })
        .then((user) => {
          callback('SIGNED_IN', { user });
        })
        .catch(() => {
          callback('SIGNED_OUT', null);
        });
    }
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  getUser: async () => {
    try {
      const userId = sessionStorage.getItem('auth_user_id');
      if (!userId) return null;
      return await apiCall('GET', '/auth/user', undefined, {
        'x-user-id': userId,
      });
    } catch (error) {
      return null;
    }
  },
};

// ============================================================
// Profiles
// ============================================================
export const profiles = {
  getByUserId: async (userId: string) => {
    try {
      return await apiCall(`/profiles/${userId}`);
    } catch (error) {
      return {
        id: userId,
        name: 'User',
        role: 'viewer',
      };
    }
  },
};

// ============================================================
// Status Pages
// ============================================================

function computeGlobalStatus(services: any[]): ServiceStatus {
  if (services.length === 0) return 'operational';
  if (services.some(s => s.status === 'down')) return 'down';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  return 'operational';
}

export const statusPages = {
  list: async (page = 1, pageSize = 20): Promise<PaginatedResponse<StatusPage>> => {
    const response = await apiCall<{ data: any[] }>('GET', '/status-pages');
    const data = response.data || [];

    const total = data.length;
    const pages: StatusPage[] = data.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      logoUrl: p.logo_url,
      brandColor: p.brand_color,
      customCss: p.custom_css,
      globalStatus: 'operational' as ServiceStatus, // Will be computed when fetching details
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    // Apply pagination
    const paginatedPages = pages.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paginatedPages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getBySlug: async (slug: string): Promise<StatusPageDetail | null> => {
    const response = await apiCall<{ data: any }>('GET', `/status-pages/${slug}`);
    const p = response.data;

    if (!p) return null;

    // Fetch services for this page
    const servicesResponse = await apiCall<{ data: any[] }>(
      'GET',
      `/services?status_page_id=${p.id}`
    );
    const servicesData = servicesResponse.data || [];

    // Fetch active incidents
    const incidentsResponse = await apiCall<{ data: any[] }>(
      'GET',
      `/incidents?status_page_id=${p.id}`
    );
    const incidentsData = (incidentsResponse.data || []).filter(
      (i: any) => i.status !== 'resolved'
    );

    const mappedServices: Service[] = servicesData.map(mapService);
    const activeIncidents: Incident[] = incidentsData.map(mapIncident);

    const globalStatus = computeGlobalStatus(servicesData);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      logoUrl: p.logo_url,
      brandColor: p.brand_color,
      customCss: p.custom_css,
      globalStatus,
      broadcastMessage: undefined,
      broadcastExpiresAt: undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      services: mappedServices,
      activeIncidents,
    };
  },

  create: async (input: {
    name: string;
    slug: string;
    description: string;
    logoUrl?: string;
    brandColor?: string;
  }) => {
    const response = await apiCall<{ data: any }>('POST', '/status-pages', {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logo_url: input.logoUrl,
      brand_color: input.brandColor,
    });
    return response.data;
  },

  update: async (
    id: string,
    input: Partial<{
      name: string;
      slug: string;
      description: string;
      logoUrl: string;
      brandColor: string;
    }>
  ) => {
    const response = await apiCall<{ data: any }>('PUT', `/status-pages/${id}`, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logo_url: input.logoUrl,
      brand_color: input.brandColor,
    });
    return response.data;
  },

  delete: async (id: string) => {
    await apiCall('DELETE', `/status-pages/${id}`);
  },
};

// ============================================================
// Services
// ============================================================

function mapService(s: any): Service {
  return {
    id: s.id,
    statusPageId: s.status_page_id,
    name: s.name,
    endpoint: s.endpoint,
    protocol: s.protocol,
    checkIntervalSeconds: s.check_interval_seconds,
    timeoutMs: s.timeout_ms,
    expectedStatusCode: s.expected_status_code,
    status: s.status,
    availability: 100,
    avgLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

export const services = {
  list: async (
    statusPageId?: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<Service>> => {
    const params = statusPageId ? `?status_page_id=${statusPageId}` : '';
    const response = await apiCall<{ data: any[] }>('GET', `/services${params}`);
    const data = response.data || [];

    const total = data.length;
    const mapped: Service[] = data.map(mapService);

    // Apply pagination
    const paginatedData = mapped.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paginatedData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  create: async (input: {
    statusPageId: string;
    name: string;
    endpoint: string;
    protocol: string;
    checkIntervalSeconds?: number;
    timeoutMs?: number;
    expectedStatusCode?: number;
  }) => {
    const response = await apiCall<{ data: any }>('POST', '/services', {
      status_page_id: input.statusPageId,
      name: input.name,
      endpoint: input.endpoint,
      protocol: input.protocol,
      check_interval_seconds: input.checkIntervalSeconds,
      timeout_ms: input.timeoutMs,
      expected_status_code: input.expectedStatusCode,
    });
    return response.data;
  },

  update: async (
    id: string,
    input: Partial<{
      name: string;
      endpoint: string;
      protocol: string;
      status: string;
      check_interval_seconds: number;
      timeout_ms: number;
      expected_status_code: number;
    }>
  ) => {
    const response = await apiCall<{ data: any }>('PUT', `/services/${id}`, input);
    return response.data;
  },

  delete: async (id: string) => {
    await apiCall('DELETE', `/services/${id}`);
  },
};

// ============================================================
// Metrics
// ============================================================

export const metrics = {
  get: async (serviceId: string, rangeHours = 24): Promise<MetricPoint[]> => {
    try {
      const response = await apiCall<{ data: any[] }>(
        'GET',
        `/health-checks/${serviceId}/history?hours=${rangeHours}&interval=1%20minute`
      );

      return (response.data || []).map((point: any) => ({
        timestamp: point.bucket,
        latencyAvg: point.avg_latency_ms || 0,
        latencyP95: point.p95_latency_ms || 0,
        latencyP99: 0,
        availability: point.availability_percent || 100,
        checkCount: point.check_count || 0,
      }));
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }
  },

  getSummary: async (serviceId: string, rangeHours = 24) => {
    try {
      const response = await apiCall<{ data: any }>(
        'GET',
        `/health-checks/${serviceId}/summary?hours=${rangeHours}`
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching metrics summary:', error);
      return null;
    }
  },

  getPageSummary: async (statusPageId: string, rangeHours = 24) => {
    try {
      const response = await apiCall<{ data: any[] }>(
        'GET',
        `/health-checks/page/${statusPageId}/summary?hours=${rangeHours}`
      );

      return response.data || [];
    } catch (error) {
      console.error('Error fetching page metrics:', error);
      return [];
    }
  },
};

// ============================================================
// Incidents
// ============================================================

function mapIncident(i: any): Incident {
  const affectedIds = (i.incident_affected_services || []).map((a: any) => a.service_id);
  return {
    id: i.id,
    statusPageId: i.status_page_id,
    title: i.title,
    status: i.status,
    severity: i.severity,
    affectedServiceIds: affectedIds,
    createdAt: i.created_at,
    resolvedAt: i.resolved_at,
    updatedAt: i.updated_at,
  };
}

export const incidents = {
  list: async (
    statusPageId?: string,
    status?: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Incident>> => {
    const params = new URLSearchParams();
    if (statusPageId) params.append('status_page_id', statusPageId);

    const response = await apiCall<{ data: any[] }>(
      'GET',
      `/incidents?${params.toString()}`
    );
    const data = response.data || [];

    // Filter by status if provided
    let filtered = data;
    if (status === 'active') {
      filtered = data.filter((i: any) => i.status !== 'resolved');
    } else if (status) {
      filtered = data.filter((i: any) => i.status === status);
    }

    const total = filtered.length;
    const mapped: Incident[] = filtered.map(mapIncident);

    // Apply pagination
    const paginatedData = mapped.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paginatedData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getById: async (id: string): Promise<IncidentDetail> => {
    const response = await apiCall<{ data: any }>('GET', `/incidents/${id}`);
    const i = response.data;

    return {
      ...mapIncident(i),
      updates: i.incident_updates || [],
    };
  },

  create: async (input: {
    statusPageId: string;
    title: string;
    severity: string;
    message: string;
    affectedServiceIds: string[];
  }) => {
    const response = await apiCall<{ data: any }>('POST', '/incidents', {
      status_page_id: input.statusPageId,
      title: input.title,
      severity: input.severity,
    });
    return response.data;
  },

  update: async (
    id: string,
    input: Partial<{ status: string; title: string; severity: string }>
  ) => {
    const response = await apiCall<{ data: any }>('PUT', `/incidents/${id}`, input);
    return response.data;
  },

  addUpdate: async (incidentId: string, status: string, message: string) => {
    // TODO: Implement incident updates endpoint
    console.log('Incident updates not yet implemented', { incidentId, status, message });
    return null;
  },

  delete: async (id: string) => {
    await apiCall('DELETE', `/incidents/${id}`);
  },
};

// ============================================================
// Broadcasts
// ============================================================

export const broadcasts = {
  list: async (statusPageId: string) => {
    // TODO: Implement broadcasts endpoint
    console.log('Broadcasts not yet implemented', { statusPageId });
    return [];
  },

  create: async (input: { statusPageId: string; message: string; expiresAt?: string }) => {
    // TODO: Implement broadcasts endpoint
    console.log('Broadcasts not yet implemented', input);
    return null;
  },

  delete: async (id: string) => {
    // TODO: Implement broadcasts endpoint
    console.log('Broadcasts not yet implemented', { id });
  },
};

// ============================================================
// Realtime subscriptions
// ============================================================
export const realtime = {
  subscribeToTable: (table: string, callback: (payload: any) => void) => {
    // TODO: Implement WebSocket subscriptions
    console.log('Realtime subscriptions not yet implemented', { table });
    return () => {};
  },
};
