import { ServiceStatus } from '@/lib/api/types';
import { formatDistanceToNow, format } from 'date-fns';

export function getStatusLabel(status: ServiceStatus): string {
  const labels: Record<ServiceStatus, string> = {
    operational: 'Operational',
    degraded: 'Degraded Performance',
    down: 'Major Outage',
    maintenance: 'Under Maintenance',
  };
  return labels[status];
}

export function getStatusColor(status: ServiceStatus): string {
  const colors: Record<ServiceStatus, string> = {
    operational: 'text-operational',
    degraded: 'text-degraded',
    down: 'text-down',
    maintenance: 'text-maintenance',
  };
  return colors[status];
}

export function getStatusBg(status: ServiceStatus): string {
  const colors: Record<ServiceStatus, string> = {
    operational: 'bg-operational',
    degraded: 'bg-degraded',
    down: 'bg-down',
    maintenance: 'bg-maintenance',
  };
  return colors[status];
}

export function getStatusDotClass(status: ServiceStatus): string {
  const classes: Record<ServiceStatus, string> = {
    operational: 'status-dot-operational',
    degraded: 'status-dot-degraded',
    down: 'status-dot-down',
    maintenance: 'status-dot-maintenance',
  };
  return classes[status];
}

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, HH:mm');
}
