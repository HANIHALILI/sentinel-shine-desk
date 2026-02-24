/**
 * Database abstraction layer.
 * 
 * ALL database access goes through this file.
 * To swap Supabase for a self-hosted Postgres + custom backend,
 * replace the implementations here — no other files need to change.
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  StatusPage, StatusPageDetail, Service, Incident, IncidentDetail,
  IncidentUpdate, BroadcastMessage, MetricPoint, PaginatedResponse,
  ServiceStatus, IncidentStatus, IncidentSeverity
} from '@/lib/api/types';

// ============================================================
// Auth
// ============================================================
export const auth = {
  signUp: (email: string, password: string, name?: string) =>
    supabase.auth.signUp({ email, password, options: { data: { name } } }),

  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (callback: (event: string, session: any) => void) =>
    supabase.auth.onAuthStateChange(callback),

  getUser: () => supabase.auth.getUser(),
};

// ============================================================
// Profiles
// ============================================================
export const profiles = {
  getByUserId: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
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
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('status_pages')
      .select('*, services(status)', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const total = count || 0;
    const pages: StatusPage[] = (data || []).map((p: any) => {
      const services = p.services || [];
      const globalStatus = computeGlobalStatus(services);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description || '',
        logoUrl: p.logo_url,
        brandColor: p.brand_color,
        customCss: p.custom_css,
        globalStatus,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    });

    return { data: pages, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  getBySlug: async (slug: string): Promise<StatusPageDetail | null> => {
    const { data: p, error } = await supabase
      .from('status_pages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!p) return null;

    // Fetch services for this page
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .eq('status_page_id', p.id)
      .order('name');

    // Fetch active incidents
    const { data: incidentsData } = await supabase
      .from('incidents')
      .select('*, incident_affected_services(service_id)')
      .eq('status_page_id', p.id)
      .neq('status', 'resolved')
      .order('created_at', { ascending: false });

    // Fetch active broadcast
    const { data: broadcastData } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('status_page_id', p.id)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(1);

    const mappedServices: Service[] = (servicesData || []).map(mapService);

    // Enrich with summary stats
    for (const svc of mappedServices) {
      try {
        const { data: summary } = await supabase.rpc('get_service_summary', { p_service_id: svc.id, p_hours: 24 });
        if (summary && summary.length > 0) {
          const s = summary[0];
          svc.availability = s.availability ?? 100;
          svc.avgLatency = Math.round(s.avg_latency ?? 0);
          svc.p95Latency = Math.round(s.p95_latency ?? 0);
          svc.p99Latency = Math.round(s.p99_latency ?? 0);
        } else {
          svc.availability = 100;
        }
      } catch {
        svc.availability = 100;
      }
    }

    const activeIncidents: Incident[] = (incidentsData || []).map(mapIncident);

    const globalStatus = computeGlobalStatus(servicesData || []);
    const broadcast = broadcastData?.[0];

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      logoUrl: p.logo_url,
      brandColor: p.brand_color,
      customCss: p.custom_css,
      globalStatus,
      broadcastMessage: broadcast?.message,
      broadcastExpiresAt: broadcast?.expires_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      services: mappedServices,
      activeIncidents,
    };
  },

  create: async (input: { name: string; slug: string; description: string; logoUrl?: string; brandColor?: string }) => {
    const { data, error } = await supabase
      .from('status_pages')
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description,
        logo_url: input.logoUrl,
        brand_color: input.brandColor,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, input: Partial<{ name: string; slug: string; description: string; logoUrl: string; brandColor: string }>) => {
    const { data, error } = await supabase
      .from('status_pages')
      .update({
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.logoUrl !== undefined && { logo_url: input.logoUrl }),
        ...(input.brandColor !== undefined && { brand_color: input.brandColor }),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('status_pages').delete().eq('id', id);
    if (error) throw error;
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
    availability: 0, // computed separately
    avgLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

export const services = {
  list: async (statusPageId?: string, page = 1, pageSize = 50): Promise<PaginatedResponse<Service>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('services')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('name');

    if (statusPageId) {
      query = query.eq('status_page_id', statusPageId);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;
    const mapped: Service[] = (data || []).map(mapService);

    // Enrich with summary stats
    for (const svc of mapped) {
      try {
        const { data: summary } = await supabase.rpc('get_service_summary', { p_service_id: svc.id, p_hours: 24 });
        if (summary && summary.length > 0) {
          const s = summary[0];
          svc.availability = s.availability ?? 100;
          svc.avgLatency = Math.round(s.avg_latency ?? 0);
          svc.p95Latency = Math.round(s.p95_latency ?? 0);
          svc.p99Latency = Math.round(s.p99_latency ?? 0);
        } else {
          svc.availability = 100;
        }
      } catch {
        svc.availability = 100;
      }
    }

    return { data: mapped, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  create: async (input: { statusPageId: string; name: string; endpoint: string; protocol: string }) => {
    const { data, error } = await supabase
      .from('services')
      .insert({
        status_page_id: input.statusPageId,
        name: input.name,
        endpoint: input.endpoint,
        protocol: input.protocol,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, input: Partial<{ name: string; endpoint: string; protocol: string; status: string }>) => {
    const { data, error } = await supabase
      .from('services')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// Metrics
// ============================================================

export const metrics = {
  get: async (serviceId: string, rangeHours = 24): Promise<MetricPoint[]> => {
    const start = new Date(Date.now() - rangeHours * 60 * 60 * 1000).toISOString();
    const end = new Date().toISOString();

    const { data, error } = await supabase.rpc('get_service_metrics', {
      p_service_id: serviceId,
      p_start: start,
      p_end: end,
    });

    if (error) throw error;

    return (data || []).map((p: any) => ({
      timestamp: p.bucket,
      latencyAvg: Math.round(p.latency_avg ?? 0),
      latencyP95: Math.round(p.latency_p95 ?? 0),
      latencyP99: Math.round(p.latency_p99 ?? 0),
      availability: p.availability ?? 100,
      checkCount: p.check_count ?? 0,
    }));
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
  list: async (statusPageId?: string, status?: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Incident>> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('incidents')
      .select('*, incident_affected_services(service_id)', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (statusPageId) query = query.eq('status_page_id', statusPageId);
    if (status === 'active') query = query.neq('status', 'resolved');
    else if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;
    return {
      data: (data || []).map(mapIncident),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getById: async (id: string): Promise<IncidentDetail> => {
    const { data: i, error } = await supabase
      .from('incidents')
      .select('*, incident_affected_services(service_id)')
      .eq('id', id)
      .single();
    if (error) throw error;

    const { data: updates } = await supabase
      .from('incident_updates')
      .select('*')
      .eq('incident_id', id)
      .order('created_at', { ascending: true });

    return {
      ...mapIncident(i),
      updates: (updates || []).map((u: any) => ({
        id: u.id,
        incidentId: u.incident_id,
        status: u.status,
        message: u.message,
        createdAt: u.created_at,
      })),
    };
  },

  create: async (input: { statusPageId: string; title: string; severity: string; message: string; affectedServiceIds: string[] }) => {
    const { data: incident, error } = await supabase
      .from('incidents')
      .insert({
        status_page_id: input.statusPageId,
        title: input.title,
        severity: input.severity,
      })
      .select()
      .single();
    if (error) throw error;

    // Add affected services
    if (input.affectedServiceIds.length > 0) {
      await supabase.from('incident_affected_services').insert(
        input.affectedServiceIds.map(sid => ({
          incident_id: incident.id,
          service_id: sid,
        }))
      );
    }

    // Add initial update
    await supabase.from('incident_updates').insert({
      incident_id: incident.id,
      status: 'investigating',
      message: input.message,
    });

    return incident;
  },

  update: async (id: string, input: Partial<{ status: string; title: string; severity: string }>) => {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        ...input,
        ...(input.status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  addUpdate: async (incidentId: string, status: string, message: string) => {
    const { data, error } = await supabase
      .from('incident_updates')
      .insert({ incident_id: incidentId, status, message })
      .select()
      .single();
    if (error) throw error;

    // Also update the incident status
    await supabase.from('incidents').update({ status }).eq('id', incidentId);

    return data;
  },
};

// ============================================================
// Broadcasts
// ============================================================

export const broadcasts = {
  list: async (statusPageId: string) => {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('status_page_id', statusPageId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((b: any): BroadcastMessage => ({
      id: b.id,
      statusPageId: b.status_page_id,
      message: b.message,
      expiresAt: b.expires_at,
      createdAt: b.created_at,
    }));
  },

  create: async (input: { statusPageId: string; message: string; expiresAt?: string }) => {
    const { data, error } = await supabase
      .from('broadcasts')
      .insert({
        status_page_id: input.statusPageId,
        message: input.message,
        expires_at: input.expiresAt,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('broadcasts').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// Realtime subscriptions
// ============================================================
export const realtime = {
  subscribeToTable: (table: string, callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};
