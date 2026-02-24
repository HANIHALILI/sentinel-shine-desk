import { useStatusPages } from '@/hooks/use-status-pages';
import { useIncidents } from '@/hooks/use-incidents';
import { useServices } from '@/hooks/use-services';
import { getStatusDotClass, getStatusLabel } from '@/lib/status-utils';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { Activity, Server, AlertTriangle, Clock } from 'lucide-react';

export default function AdminOverview() {
  const { data: pagesData, isLoading: pagesLoading, error: pagesError, refetch: refetchPages } = useStatusPages();
  const { data: servicesData, isLoading: servicesLoading } = useServices();
  const { data: incidentsData, isLoading: incidentsLoading } = useIncidents(undefined, 'active');

  if (pagesError) return <ErrorState error={pagesError} onRetry={() => refetchPages()} />;

  const isLoading = pagesLoading || servicesLoading || incidentsLoading;
  const pages = pagesData?.data || [];
  const totalServices = servicesData?.total || 0;
  const activeIncidents = incidentsData?.total || 0;

  const stats = [
    { label: 'Status Pages', value: pages.length, icon: Activity, color: 'text-chart-latency' },
    { label: 'Total Services', value: totalServices, icon: Server, color: 'text-operational' },
    { label: 'Check Interval', value: '60s', icon: Clock, color: 'text-foreground' },
    { label: 'Active Incidents', value: activeIncidents, icon: AlertTriangle, color: activeIncidents > 0 ? 'text-degraded' : 'text-operational' },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

      {isLoading ? (
        <LoadingState message="Loading dashboard..." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(stat => (
              <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold font-mono text-card-foreground">{stat.value}</div>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status Pages</h2>
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {pages.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No status pages configured.</div>
            ) : (
              pages.map(page => (
                <div key={page.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={getStatusDotClass(page.globalStatus)} />
                    <div>
                      <div className="font-medium text-card-foreground">{page.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">/status/{page.slug}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${page.globalStatus === 'operational' ? 'text-operational' : 'text-degraded'}`}>
                    {getStatusLabel(page.globalStatus)}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
