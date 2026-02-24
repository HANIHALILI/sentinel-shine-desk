import { AlertTriangle } from 'lucide-react';

export function BroadcastBanner({ message }: { message: string }) {
  return (
    <div className="bg-degraded/10 border border-degraded/30 rounded-lg px-5 py-3.5 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-degraded shrink-0 mt-0.5" />
      <p className="text-sm text-foreground">{message}</p>
    </div>
  );
}
