import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { broadcasts } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { StatusPage } from '@/lib/api/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusPages: StatusPage[];
}

export function BroadcastDialog({ open, onOpenChange, statusPages: pages }: Props) {
  const qc = useQueryClient();
  const [statusPageId, setStatusPageId] = useState(pages[0]?.id || '');
  const [message, setMessage] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');

  const mutation = useMutation({
    mutationFn: () => {
      const hours = parseInt(expiresIn);
      const expiresAt = hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : undefined;
      return broadcasts.create({ statusPageId, message, expiresAt });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-page'] });
      toast.success('Broadcast posted');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post Broadcast</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status Page</label>
            <select value={statusPageId} onChange={e => setStatusPageId(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
              {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={3} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm" placeholder="Scheduled maintenance tonight at 22:00 UTC..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Expires In (hours)</label>
            <select value={expiresIn} onChange={e => setExpiresIn(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="0">Never</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
              {mutation.isPending ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
