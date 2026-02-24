import { getAllStatusPages } from '@/lib/mock-data';
import { getStatusDotClass } from '@/lib/status-utils';
import { Plus } from 'lucide-react';

export default function AdminServices() {
  const pages = getAllStatusPages();
  const allServices = pages.flatMap(p => p.services.map(s => ({ ...s, pageName: p.name })));

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Services</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
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
          <tbody className="divide-y divide-border">
            {allServices.map(service => (
              <tr key={service.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-card-foreground">{service.name}</div>
                  <div className="text-xs text-muted-foreground">{service.pageName}</div>
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
                <td className="px-4 py-3 text-right font-mono text-card-foreground">{service.availability}%</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">{service.avgLatency}ms</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">{service.p95Latency}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
