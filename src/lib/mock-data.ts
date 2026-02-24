import { StatusPage, Service, Incident, LatencyPoint, ServiceStatus } from './types';

function generateLatencyHistory(baseLatency: number, variance: number, status: ServiceStatus): LatencyPoint[] {
  const points: LatencyPoint[] = [];
  const now = new Date();
  for (let i = 1440; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60000);
    const jitter = (Math.random() - 0.5) * variance;
    let latency = Math.max(1, baseLatency + jitter);
    let pointStatus: ServiceStatus = 'operational';

    // Add some degraded/down spikes
    if (status === 'degraded' && i < 60 && Math.random() > 0.7) {
      latency = baseLatency * 3 + Math.random() * 200;
      pointStatus = 'degraded';
    }
    if (status === 'down' && i < 30) {
      latency = 0;
      pointStatus = 'down';
    }

    points.push({
      timestamp: timestamp.toISOString(),
      latency: Math.round(latency),
      status: pointStatus,
    });
  }
  return points;
}

const apiGatewayHistory = generateLatencyHistory(45, 20, 'operational');
const authServiceHistory = generateLatencyHistory(32, 15, 'operational');
const databaseHistory = generateLatencyHistory(12, 8, 'operational');
const cdnHistory = generateLatencyHistory(8, 5, 'operational');
const searchHistory = generateLatencyHistory(85, 40, 'degraded');
const storageHistory = generateLatencyHistory(22, 10, 'operational');
const websocketHistory = generateLatencyHistory(15, 8, 'operational');
const mlPipelineHistory = generateLatencyHistory(250, 100, 'operational');

function computeAvailability(history: LatencyPoint[]): number {
  const total = history.length;
  const up = history.filter(p => p.status !== 'down').length;
  return parseFloat(((up / total) * 100).toFixed(3));
}

function computePercentile(history: LatencyPoint[], p: number): number {
  const latencies = history.filter(h => h.latency > 0).map(h => h.latency).sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * latencies.length) - 1;
  return latencies[idx] || 0;
}

function makeService(id: string, name: string, endpoint: string, protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'gRPC', status: ServiceStatus, history: LatencyPoint[]): Service {
  const latencies = history.filter(h => h.latency > 0).map(h => h.latency);
  return {
    id,
    name,
    endpoint,
    protocol,
    checkInterval: 60,
    timeout: 5000,
    expectedStatusCode: 200,
    status,
    availability: computeAvailability(history),
    avgLatency: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p95Latency: computePercentile(history, 95),
    p99Latency: computePercentile(history, 99),
    latencyHistory: history,
  };
}

const platformServices: Service[] = [
  makeService('api-gateway', 'API Gateway', 'https://api.example.com/health', 'HTTPS', 'operational', apiGatewayHistory),
  makeService('auth-service', 'Authentication', 'https://auth.example.com/health', 'HTTPS', 'operational', authServiceHistory),
  makeService('database', 'Primary Database', 'tcp://db.internal:5432', 'TCP', 'operational', databaseHistory),
  makeService('cdn', 'CDN Edge', 'https://cdn.example.com/probe', 'HTTPS', 'operational', cdnHistory),
  makeService('search', 'Search Engine', 'https://search.example.com/health', 'HTTPS', 'degraded', searchHistory),
  makeService('storage', 'Object Storage', 'https://storage.example.com/health', 'HTTPS', 'operational', storageHistory),
  makeService('websocket', 'WebSocket Gateway', 'wss://ws.example.com/health', 'TCP', 'operational', websocketHistory),
];

const aiServices: Service[] = [
  makeService('ml-pipeline', 'ML Pipeline', 'grpc://ml.internal:50051', 'gRPC', 'operational', mlPipelineHistory),
  makeService('inference', 'Inference API', 'https://inference.example.com/health', 'HTTPS', 'operational', generateLatencyHistory(120, 60, 'operational')),
  makeService('training', 'Training Cluster', 'grpc://training.internal:50052', 'gRPC', 'operational', generateLatencyHistory(300, 150, 'operational')),
];

const platformIncidents: Incident[] = [
  {
    id: 'inc-1',
    title: 'Elevated Search Latency',
    status: 'monitoring',
    severity: 'minor',
    affectedServices: ['search'],
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updates: [
      { id: 'u1', status: 'investigating', message: 'We are investigating elevated latency on the Search Engine.', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
      { id: 'u2', status: 'identified', message: 'Root cause identified: index rebuild triggered unexpectedly.', timestamp: new Date(Date.now() - 1.5 * 3600000).toISOString() },
      { id: 'u3', status: 'monitoring', message: 'Fix deployed. Monitoring for stability.', timestamp: new Date(Date.now() - 0.5 * 3600000).toISOString() },
    ],
  },
  {
    id: 'inc-2',
    title: 'Scheduled Database Maintenance',
    status: 'resolved',
    severity: 'minor',
    affectedServices: ['database'],
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 46 * 3600000).toISOString(),
    updates: [
      { id: 'u4', status: 'investigating', message: 'Starting scheduled maintenance window for primary database.', timestamp: new Date(Date.now() - 48 * 3600000).toISOString() },
      { id: 'u5', status: 'resolved', message: 'Maintenance completed successfully. All services operational.', timestamp: new Date(Date.now() - 46 * 3600000).toISOString() },
    ],
  },
];

function computeGlobalStatus(services: Service[]): ServiceStatus {
  if (services.some(s => s.status === 'down')) return 'down';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  return 'operational';
}

export const mockStatusPages: StatusPage[] = [
  {
    id: 'platform',
    name: 'Platform Status',
    slug: 'platform',
    description: 'Real-time status for all core platform services',
    services: platformServices,
    incidents: platformIncidents,
    broadcastMessage: 'Search Engine is experiencing elevated latency. Our team is actively working on a fix.',
    globalStatus: computeGlobalStatus(platformServices),
  },
  {
    id: 'ai',
    name: 'AI Services',
    slug: 'ai',
    description: 'Status page for ML and AI infrastructure',
    services: aiServices,
    incidents: [],
    globalStatus: computeGlobalStatus(aiServices),
  },
];

export function getStatusPage(slug: string): StatusPage | undefined {
  return mockStatusPages.find(p => p.slug === slug);
}

export function getAllStatusPages(): StatusPage[] {
  return mockStatusPages;
}
