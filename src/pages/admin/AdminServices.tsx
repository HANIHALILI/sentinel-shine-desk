import { useState } from 'react';
import { useServices } from '@/hooks/use-services';
import { useStatusPages } from '@/hooks/use-status-pages';
import { getStatusDotClass } from '@/lib/status-utils';
import { Plus, Pencil } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { ServiceDialog } from '@/components/admin/ServiceDialog';
import type { Service } from '@/lib/api/types';

export default function AdminServices() {
  const { data, isLoading, error, refetch } = useServices(undefined, 1, 200);
  const { data: pagesData } = useStatusPages();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);

  if (isLoading) return <div className="p-8"><LoadingState /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} onRetry={() => refetch()} /></div>;

  const services = data?.data || [];
  const pages = pagesData?.data || [];

  const openEdit = (svc: Service) => { setEditService(svc); setDialogOpen(true); };
  const openCreate = () => { setEditService(null); setDialogOpen(true); };

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Services
          {data?.total != null && <span className="text-muted-foreground font-normal text-lg ml-2">({data.total})</span>}
        </h1>
        <button onClick={openCreate} disabled={pages.length === 0} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <EmptyState title="No services" description={pages.length === 0 ? "Create a status page first, then add services." : "Add a service to start monitoring."} />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Endpoint</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uptime</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Avg</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map(service => (
                <tr key={service.id} className="hover:bg-muted/20 transition-colors">
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
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(service)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServiceDialog open={dialogOpen} onOpenChange={setDialogOpen} editService={editService} statusPages={pages} />
    </div>
  );
}
