import { useIncidents } from '@/hooks/use-incidents';
import { getStatusDotClass, timeAgo } from '@/lib/status-utils';
import { Plus } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { useState } from 'react';

export default function AdminIncidents() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useIncidents(undefined, undefined, page, 20);

  if (isLoading) return <div className="p-8"><LoadingState /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} onRetry={() => refetch()} /></div>;

  const incidents = data?.data || [];

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Incidents</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Create Incident
        </button>
      </div>

      {incidents.length === 0 ? (
        <EmptyState title="No incidents" description="No incidents have been recorded." />
      ) : (
        <>
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {incidents.map(incident => (
              <div key={incident.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 ${getStatusDotClass(incident.status === 'resolved' ? 'operational' : 'degraded')}`} />
                    <div>
                      <h3 className="font-semibold text-card-foreground">{incident.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize font-medium">{incident.status}</span>
                        <span>•</span>
                        <span>{incident.severity}</span>
                        <span>•</span>
                        <span>{incident.affectedServiceIds.length} service(s)</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(incident.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
