import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { incidents } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Incident, StatusPage, Service } from '@/lib/api/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editIncident?: Incident | null;
  statusPages: StatusPage[];
  services: Service[];
}

export function IncidentDialog({ open, onOpenChange, editIncident, statusPages: pages, services: svcs }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editIncident;

  const [title, setTitle] = useState(editIncident?.title || '');
  const [severity, setSeverity] = useState<string>(editIncident?.severity || 'minor');
  const [statusPageId, setStatusPageId] = useState(editIncident?.statusPageId || pages[0]?.id || '');
  const [status, setStatus] = useState<string>(editIncident?.status || 'investigating');
  const [message, setMessage] = useState('');
  const [affectedIds, setAffectedIds] = useState<string[]>(editIncident?.affectedServiceIds || []);

  const filteredServices = svcs.filter(s => s.statusPageId === statusPageId);

  const handleOpenChange = (v: boolean) => {
    if (v && editIncident) {
      setTitle(editIncident.title);
      setSeverity(editIncident.severity);
      setStatusPageId(editIncident.statusPageId);
      setStatus(editIncident.status);
      setAffectedIds(editIncident.affectedServiceIds);
      setMessage('');
    } else if (v) {
      setTitle(''); setSeverity('minor'); setStatusPageId(pages[0]?.id || ''); setStatus('investigating'); setMessage(''); setAffectedIds([]);
    }
    onOpenChange(v);
  };

  const toggleService = (id: string) => {
    setAffectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const createMutation = useMutation({
    mutationFn: () => incidents.create({ statusPageId, title, severity, message, affectedServiceIds: affectedIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident created');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await incidents.update(editIncident!.id, { title, severity, status });
      if (message.trim()) {
        await incidents.addUpdate(editIncident!.id, status, message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident updated');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => incidents.delete(editIncident!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident deleted');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isEdit ? updateMutation.mutate() : createMutation.mutate();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Update Incident' : 'Create Incident'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status Page</label>
              <select value={statusPageId} onChange={e => { setStatusPageId(e.target.value); setAffectedIds([]); }} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
                {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm" placeholder="Database connectivity issues" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            )}
          </div>
          {filteredServices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Affected Services</label>
              <div className="space-y-1 max-h-32 overflow-auto border border-input rounded-md p-2">
                {filteredServices.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={affectedIds.includes(s.id)} onChange={() => toggleService(s.id)} className="rounded" />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {isEdit ? 'Update Message (optional)' : 'Initial Message'}
            </label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} required={!isEdit} rows={3} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm" placeholder="We are investigating reports of..." />
          </div>
          <div className="flex items-center justify-between pt-2">
            {isEdit && (
              <button type="button" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="text-sm text-destructive hover:underline">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted">Cancel</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
                {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
