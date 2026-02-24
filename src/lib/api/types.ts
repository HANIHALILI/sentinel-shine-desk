// ============================================================
// StatusGuard — Strict API Types (Backend Contract)
// All types match the OpenAPI specification in docs/openapi.yaml
// ============================================================

// ---- Enums ----
export type ServiceStatus = 'operational' | 'degraded' | 'down' | 'maintenance';
export type ServiceProtocol = 'HTTP' | 'HTTPS' | 'TCP' | 'gRPC';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentSeverity = 'minor' | 'major' | 'critical';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed';
export type UserRole = 'admin' | 'editor' | 'viewer';

// ---- Pagination ----
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---- Status Pages ----
export interface StatusPage {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  brandColor?: string;
  customCss?: string;
  globalStatus: ServiceStatus;
  broadcastMessage?: string;
  broadcastExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusPageDetail extends StatusPage {
  services: Service[];
  activeIncidents: Incident[];
}

export interface CreateStatusPageRequest {
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  brandColor?: string;
  customCss?: string;
}

export interface UpdateStatusPageRequest extends Partial<CreateStatusPageRequest> {}

// ---- Services ----
export interface Service {
  id: string;
  statusPageId: string;
  name: string;
  endpoint: string;
  protocol: ServiceProtocol;
  checkIntervalSeconds: number;
  timeoutMs: number;
  expectedStatusCode: number;
  status: ServiceStatus;
  availability: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  statusPageId: string;
  name: string;
  endpoint: string;
  protocol: ServiceProtocol;
  checkIntervalSeconds: number;
  timeoutMs: number;
  expectedStatusCode: number;
}

export interface UpdateServiceRequest extends Partial<Omit<CreateServiceRequest, 'statusPageId'>> {}

// ---- Metrics ----
/** Single aggregated metric point — computed at query time from raw checks */
export interface MetricPoint {
  timestamp: string;
  latencyAvg: number;
  latencyP95: number;
  latencyP99: number;
  availability: number;
  /** Number of raw checks in this bucket */
  checkCount: number;
  /** True if no checks exist for this interval */
  isGap?: boolean;
}

/** Service summary stats computed from raw checks */
export interface ServiceSummary {
  availability: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalChecks: number;
  failedChecks: number;
}

export type MetricResolution = '1m' | '5m' | '1h';
export type MetricRange = '1h' | '6h' | '24h' | '7d' | '30d';

export interface MetricsQuery {
  serviceId: string;
  range: MetricRange;
  resolution: MetricResolution;
}

export interface MetricsResponse {
  serviceId: string;
  range: MetricRange;
  resolution: MetricResolution;
  points: MetricPoint[];
}

// ---- Incidents ----
export interface Incident {
  id: string;
  statusPageId: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  affectedServiceIds: string[];
  createdAt: string;
  resolvedAt?: string;
  updatedAt: string;
}

export interface IncidentDetail extends Incident {
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  message: string;
  createdAt: string;
}

export interface CreateIncidentRequest {
  statusPageId: string;
  title: string;
  severity: IncidentSeverity;
  affectedServiceIds: string[];
  message: string;
}

export interface UpdateIncidentRequest {
  status?: IncidentStatus;
  title?: string;
  severity?: IncidentSeverity;
  affectedServiceIds?: string[];
}

export interface CreateIncidentUpdateRequest {
  status: IncidentStatus;
  message: string;
}

// ---- Broadcast Messages ----
export interface BroadcastMessage {
  id: string;
  statusPageId: string;
  message: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateBroadcastRequest {
  statusPageId: string;
  message: string;
  expiresAt?: string;
}

// ---- Maintenance Windows ----
export interface MaintenanceWindow {
  id: string;
  statusPageId: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  affectedServiceIds: string[];
  status: MaintenanceStatus;
  createdAt: string;
}

export interface CreateMaintenanceRequest {
  statusPageId: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  affectedServiceIds: string[];
}

// ---- WebSocket Events ----
export type WSEventType =
  | 'service.status_changed'
  | 'incident.created'
  | 'incident.updated'
  | 'metrics.update'
  | 'broadcast.created'
  | 'broadcast.expired';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  statusPageId: string;
  payload: T;
  timestamp: string;
}

// ---- API Error ----
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status: number;
}

// ---- Admin Config ----
export interface SystemConfig {
  retentionDays: number;
  checkConcurrency: number;
}

export interface UpdateSystemConfigRequest {
  retentionDays?: number;
  checkConcurrency?: number;
}

export interface CleanupResult {
  deletedRows: number;
}
