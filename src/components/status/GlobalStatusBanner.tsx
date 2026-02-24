import type { ServiceStatus } from '@/lib/api/types';
import { getStatusLabel, getStatusBg } from '@/lib/status-utils';
import { AlertTriangle, CheckCircle2, XCircle, Wrench } from 'lucide-react';

const icons: Record<ServiceStatus, React.ReactNode> = {
  operational: <CheckCircle2 className="w-5 h-5" />,
  degraded: <AlertTriangle className="w-5 h-5" />,
  down: <XCircle className="w-5 h-5" />,
  maintenance: <Wrench className="w-5 h-5" />,
};

export function GlobalStatusBanner({ status }: { status: ServiceStatus }) {
  return (
    <div className={`${getStatusBg(status)} text-primary-foreground px-6 py-4 rounded-lg flex items-center gap-3`}>
      {icons[status]}
      <span className="font-semibold text-lg">{getStatusLabel(status)}</span>
      {status === 'operational' && (
        <span className="text-sm opacity-80 ml-1">— All systems are running normally</span>
      )}
    </div>
  );
}
