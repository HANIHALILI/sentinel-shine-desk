import { useRef, useMemo } from 'react';
import { useServices } from '@/hooks/use-services';
import { getStatusDotClass } from '@/lib/status-utils';
import { Plus } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Service } from '@/lib/api/types';

export default function AdminServices() {
  const { data, isLoading, error, refetch } = useServices(undefined, 1, 200);

  if (isLoading) return <div className="p-8"><LoadingState /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} onRetry={() => refetch()} /></div>;

  const services = data?.data || [];

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Services
          {data?.total != null && <span className="text-muted-foreground font-normal text-lg ml-2">({data.total})</span>}
        </h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <EmptyState title="No services" description="Add a service to start monitoring." />
      ) : (
        <ServiceTable services={services} />
      )}
    </div>
  );
}

function ServiceTable({ services }: { services: Service[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: services.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  // Only use virtualizer if 50+ services
  const useVirtual = services.length >= 50;

  if (!useVirtual) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <TableHeader />
          <tbody className="divide-y divide-border">
            {services.map(service => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <TableHeader />
      </table>
      <div ref={parentRef} className="max-h-[600px] overflow-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const service = services[virtualRow.index];
            return (
              <div
                key={service.id}
                style={{
                  position: 'absolute',
                  top: virtualRow.start,
                  left: 0,
                  right: 0,
                  height: virtualRow.size,
                }}
              >
                <table className="w-full text-sm">
                  <tbody>
                    <ServiceRow service={service} />
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <thead>
      <tr className="border-b border-border bg-muted/30">
        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Endpoint</th>
        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uptime</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Avg</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">p95</th>
      </tr>
    </thead>
  );
}

function ServiceRow({ service }: { service: Service }) {
  return (
    <tr className="hover:bg-muted/20 transition-colors border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="font-medium text-card-foreground">{service.name}</div>
        <div className="text-xs text-muted-foreground font-mono">{service.protocol}</div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] block">{service.endpoint}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={getStatusDotClass(service.status)} />
          <span className="capitalize text-card-foreground">{service.status}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-card-foreground">{service.availability.toFixed(2)}%</td>
      <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">{service.avgLatency}ms</td>
      <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">{service.p95Latency}ms</td>
    </tr>
  );
}
