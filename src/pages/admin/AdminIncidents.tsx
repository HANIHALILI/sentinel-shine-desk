import { getAllStatusPages } from '@/lib/mock-data';
import { getStatusDotClass, timeAgo } from '@/lib/status-utils';
import { Plus } from 'lucide-react';

export default function AdminIncidents() {
  const pages = getAllStatusPages();
  const allIncidents = pages.flatMap(p => p.incidents.map(i => ({ ...i, pageName: p.name })));

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Incidents</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Create Incident
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {allIncidents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No incidents recorded.</div>
        ) : (
          allIncidents.map(incident => (
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
                      <span>{incident.pageName}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(incident.createdAt)}</span>
              </div>
              {incident.updates.length > 0 && (
                <div className="mt-3 ml-6 pl-3 border-l-2 border-border space-y-2">
                  {incident.updates.slice(-2).map(u => (
                    <div key={u.id} className="text-sm">
                      <span className="text-xs font-medium text-muted-foreground uppercase">{u.status}</span>
                      <p className="text-card-foreground">{u.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
