import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { services } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Service, StatusPage } from '@/lib/api/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editService?: Service | null;
  statusPages: StatusPage[];
}

export function ServiceDialog({ open, onOpenChange, editService, statusPages: pages }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editService;

  const [name, setName] = useState(editService?.name || '');
  const [endpoint, setEndpoint] = useState(editService?.endpoint || '');
  const [protocol, setProtocol] = useState<string>(editService?.protocol || 'HTTPS');
  const [statusPageId, setStatusPageId] = useState(editService?.statusPageId || pages[0]?.id || '');
  const [status, setStatus] = useState<string>(editService?.status || 'operational');
  const [checkInterval, setCheckInterval] = useState(editService?.checkIntervalSeconds || 60);
  const [timeoutMs, setTimeoutMs] = useState(editService?.timeoutMs || 5000);
  const [expectedStatus, setExpectedStatus] = useState(editService?.expectedStatusCode || 200);

  const handleOpenChange = (v: boolean) => {
    if (v && editService) {
      setName(editService.name);
      setEndpoint(editService.endpoint);
      setProtocol(editService.protocol);
      setStatusPageId(editService.statusPageId);
      setStatus(editService.status);
      setCheckInterval(editService.checkIntervalSeconds);
      setTimeoutMs(editService.timeoutMs);
      setExpectedStatus(editService.expectedStatusCode);
    } else if (v) {
      setName(''); setEndpoint(''); setProtocol('HTTPS'); setStatusPageId(pages[0]?.id || ''); setStatus('operational');
      setCheckInterval(60); setTimeoutMs(5000); setExpectedStatus(200);
    }
    onOpenChange(v);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return services.update(editService!.id, {
          name, endpoint, protocol, status,
          check_interval_seconds: checkInterval,
          timeout_ms: timeoutMs,
          expected_status_code: expectedStatus,
        });
      }
      return services.create({
        statusPageId, name, endpoint, protocol,
        checkIntervalSeconds: checkInterval,
        timeoutMs,
        expectedStatusCode: expectedStatus,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success(isEdit ? 'Service updated' : 'Service created');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => services.delete(editService!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Service' : 'Add Service'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status Page</label>
              <select value={statusPageId} onChange={e => setStatusPageId(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
                {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm" placeholder="API Gateway" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Endpoint</label>
            <input value={endpoint} onChange={e => setEndpoint(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm font-mono" placeholder="https://api.example.com/health" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Protocol</label>
              <select value={protocol} onChange={e => setProtocol(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
                <option>HTTPS</option><option>HTTP</option><option>TCP</option><option>gRPC</option>
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
                  <option value="operational">Operational</option>
                  <option value="degraded">Degraded</option>
                  <option value="down">Down</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            )}
          </div>

          {/* Monitoring Config */}
          <div className="border-t border-border pt-3">
            <h3 className="text-sm font-medium text-foreground mb-3">Monitoring Config</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Interval (s)</label>
                <input type="number" value={checkInterval} onChange={e => setCheckInterval(Number(e.target.value))} min={10} className="w-full px-2 py-1.5 bg-background border border-input rounded-md text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Timeout (ms)</label>
                <input type="number" value={timeoutMs} onChange={e => setTimeoutMs(Number(e.target.value))} min={500} className="w-full px-2 py-1.5 bg-background border border-input rounded-md text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Expected Status</label>
                <input type="number" value={expectedStatus} onChange={e => setExpectedStatus(Number(e.target.value))} className="w-full px-2 py-1.5 bg-background border border-input rounded-md text-sm font-mono" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isEdit && (
              <button type="button" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="text-sm text-destructive hover:underline">Delete</button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted">Cancel</button>
              <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
                {mutation.isPending ? 'Saving...' : isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
