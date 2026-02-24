import { Service } from '@/lib/types';
import { getStatusDotClass } from '@/lib/status-utils';
import { LatencyChart } from './LatencyChart';

export function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={getStatusDotClass(service.status)} />
          <div>
            <h3 className="font-semibold text-card-foreground">{service.name}</h3>
            <span className="text-xs text-muted-foreground font-mono">{service.protocol}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono font-semibold text-card-foreground">{service.availability}%</div>
          <div className="text-xs text-muted-foreground">uptime</div>
        </div>
      </div>

      <LatencyChart data={service.latencyHistory} />

      <div className="grid grid-cols-3 gap-3 pt-1">
        <MetricCell label="Avg" value={`${service.avgLatency}ms`} />
        <MetricCell label="p95" value={`${service.p95Latency}ms`} />
        <MetricCell label="p99" value={`${service.p99Latency}ms`} />
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-md px-3 py-2 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-mono font-medium text-foreground mt-0.5">{value}</div>
    </div>
  );
}
