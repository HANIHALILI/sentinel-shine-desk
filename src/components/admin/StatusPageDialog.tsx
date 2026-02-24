import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { statusPages } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { StatusPage } from '@/lib/api/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPage?: StatusPage | null;
}

export function StatusPageDialog({ open, onOpenChange, editPage }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editPage;

  const [name, setName] = useState(editPage?.name || '');
  const [slug, setSlug] = useState(editPage?.slug || '');
  const [description, setDescription] = useState(editPage?.description || '');
  const [brandColor, setBrandColor] = useState(editPage?.brandColor || '#22c55e');

  // Reset form when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v && editPage) {
      setName(editPage.name);
      setSlug(editPage.slug);
      setDescription(editPage.description);
      setBrandColor(editPage.brandColor || '#22c55e');
    } else if (v && !editPage) {
      setName(''); setSlug(''); setDescription(''); setBrandColor('#22c55e');
    }
    onOpenChange(v);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return statusPages.update(editPage!.id, { name, slug, description, brandColor });
      }
      return statusPages.create({ name, slug, description, brandColor });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-pages'] });
      toast.success(isEdit ? 'Page updated' : 'Page created');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => statusPages.delete(editPage!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-pages'] });
      toast.success('Page deleted');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const autoSlug = (val: string) => {
    setName(val);
    if (!isEdit) setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Status Page' : 'New Status Page'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input value={name} onChange={e => autoSlug(e.target.value)} required className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm" placeholder="My Platform" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} required pattern="[a-z0-9\-]+" className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm font-mono" placeholder="my-platform" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm" placeholder="Status page description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Brand Color</label>
            <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-10 h-10 rounded border border-input cursor-pointer" />
          </div>
          <div className="flex items-center justify-between pt-2">
            {isEdit && (
              <button type="button" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="text-sm text-destructive hover:underline">
                Delete Page
              </button>
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
