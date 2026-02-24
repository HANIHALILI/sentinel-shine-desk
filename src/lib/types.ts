export type ServiceStatus = 'operational' | 'degraded' | 'down' | 'maintenance';

export interface LatencyPoint {
  timestamp: string;
  latency: number;
  status: ServiceStatus;
}

export interface Service {
  id: string;
  name: string;
  endpoint: string;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'gRPC';
  checkInterval: number;
  timeout: number;
  expectedStatusCode: number;
  status: ServiceStatus;
  availability: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  latencyHistory: LatencyPoint[];
}

export interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  affectedServices: string[];
  createdAt: string;
  resolvedAt?: string;
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  id: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface StatusPage {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  brandColor?: string;
  services: Service[];
  incidents: Incident[];
  broadcastMessage?: string;
  globalStatus: ServiceStatus;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  affectedServices: string[];
  status: 'scheduled' | 'in_progress' | 'completed';
}

export type UserRole = 'admin' | 'editor' | 'viewer';
