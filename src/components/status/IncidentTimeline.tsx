import type { Incident } from '@/lib/api/types';
import { getStatusDotClass, timeAgo, formatTime } from '@/lib/status-utils';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useIncident } from '@/hooks/use-incidents';

export function IncidentTimeline({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No incidents reported.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map(incident => (
        <IncidentEntry key={incident.id} incident={incident} />
      ))}
    </div>
  );
}

function IncidentEntry({ incident }: { incident: Incident }) {
  const [open, setOpen] = useState(incident.status !== 'resolved');
  const { data: detail } = useIncident(open ? incident.id : '');

  const severityColors = {
    minor: 'text-degraded',
    major: 'text-down',
    critical: 'text-down',
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={getStatusDotClass(incident.status === 'resolved' ? 'operational' : 'degraded')} />
          <div>
            <h4 className="font-medium text-card-foreground">{incident.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium uppercase ${severityColors[incident.severity]}`}>
                {incident.severity}
              </span>
              <span className="text-xs text-muted-foreground">• {timeAgo(incident.createdAt)}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && detail?.updates && (
        <div className="px-5 pb-4 border-t border-border pt-3">
          <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {detail.updates.map(update => (
              <div key={update.id} className="pl-6 relative">
                <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-muted border-2 border-border" />
                <div className="text-xs text-muted-foreground font-medium uppercase">{update.status}</div>
                <p className="text-sm text-card-foreground mt-0.5">{update.message}</p>
                <span className="text-xs text-muted-foreground mt-1 block">{formatTime(update.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
